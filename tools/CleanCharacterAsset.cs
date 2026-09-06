using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class CleanCharacterAsset {
  const int CanvasWidth = 512;
  const int CanvasHeight = 1280;

  static Bitmap ToArgb(Bitmap source) {
    var copy = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(copy)) {
      g.CompositingMode = CompositingMode.SourceCopy;
      g.DrawImageUnscaled(source, 0, 0);
    }
    return copy;
  }

  static bool IsCheckerOrChroma(Color color) {
    if (color.A < 12) return true;
    int max = Math.Max(color.R, Math.Max(color.G, color.B));
    int min = Math.Min(color.R, Math.Min(color.G, color.B));
    bool paleNeutral = max - min <= 15 && min >= 202;
    bool chromaGreen = color.G >= 115 && color.G > color.R * 1.22 && color.G > color.B * 1.22;
    return paleNeutral || chromaGreen;
  }

  static void RemoveConnectedBackground(Bitmap image) {
    int width = image.Width;
    int height = image.Height;
    var visited = new bool[width, height];
    var queue = new Queue<Point>();
    Action<int, int> seed = (x, y) => {
      if (visited[x, y] || !IsCheckerOrChroma(image.GetPixel(x, y))) return;
      visited[x, y] = true;
      queue.Enqueue(new Point(x, y));
    };

    for (int x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
    for (int y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }

    while (queue.Count > 0) {
      var point = queue.Dequeue();
      for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
          if (dx == 0 && dy == 0) continue;
          int x = point.X + dx;
          int y = point.Y + dy;
          if (x < 0 || x >= width || y < 0 || y >= height || visited[x, y]) continue;
          if (!IsCheckerOrChroma(image.GetPixel(x, y))) continue;
          visited[x, y] = true;
          queue.Enqueue(new Point(x, y));
        }
      }
    }

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        if (visited[x, y]) image.SetPixel(x, y, Color.Transparent);
      }
    }
  }

  static bool TouchesTransparency(Bitmap image, int x, int y) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        if (dx == 0 && dy == 0) continue;
        int xx = x + dx;
        int yy = y + dy;
        if (xx < 0 || xx >= image.Width || yy < 0 || yy >= image.Height || image.GetPixel(xx, yy).A < 12) return true;
      }
    }
    return false;
  }

  static Color FindInteriorColor(Bitmap image, int x, int y, Color fallback) {
    for (int radius = 1; radius <= 6; radius++) {
      for (int yy = Math.Max(0, y - radius); yy <= Math.Min(image.Height - 1, y + radius); yy++) {
        for (int xx = Math.Max(0, x - radius); xx <= Math.Min(image.Width - 1, x + radius); xx++) {
          var candidate = image.GetPixel(xx, yy);
          if (candidate.A >= 245 && !TouchesTransparency(image, xx, yy)) return candidate;
        }
      }
    }
    return fallback;
  }

  static void Defringe(Bitmap image) {
    var updates = new List<Tuple<int, int, Color>>();
    for (int y = 0; y < image.Height; y++) {
      for (int x = 0; x < image.Width; x++) {
        var color = image.GetPixel(x, y);
        if (color.A == 0 || !TouchesTransparency(image, x, y)) continue;
        int max = Math.Max(color.R, Math.Max(color.G, color.B));
        int min = Math.Min(color.R, Math.Min(color.G, color.B));
        bool whiteHalo = color.A > 220 && min > 205 && max - min < 28;
        bool greenHalo = color.G > color.R * 1.16 && color.G > color.B * 1.16;
        if (whiteHalo || greenHalo) {
          updates.Add(Tuple.Create(x, y, Color.Transparent));
          continue;
        }
        if (color.A < 250) {
          var interior = FindInteriorColor(image, x, y, color);
          updates.Add(Tuple.Create(x, y, Color.FromArgb(color.A, interior.R, interior.G, interior.B)));
        }
      }
    }
    foreach (var update in updates) image.SetPixel(update.Item1, update.Item2, update.Item3);
  }

  static Rectangle FindBounds(Bitmap image, int startX, int endX) {
    int minX = endX;
    int minY = image.Height;
    int maxX = startX - 1;
    int maxY = -1;
    for (int y = 0; y < image.Height; y++) {
      for (int x = startX; x < endX; x++) {
        if (image.GetPixel(x, y).A < 16) continue;
        minX = Math.Min(minX, x);
        minY = Math.Min(minY, y);
        maxX = Math.Max(maxX, x);
        maxY = Math.Max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) throw new InvalidOperationException("No visible subject pixels were found.");
    return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
  }

  static Bitmap Normalize(Bitmap image, Rectangle bounds) {
    int pad = 12;
    double scale = Math.Min((CanvasWidth - pad * 2) / (double)bounds.Width, (CanvasHeight - pad * 2) / (double)bounds.Height);
    int width = Math.Max(1, (int)Math.Round(bounds.Width * scale));
    int height = Math.Max(1, (int)Math.Round(bounds.Height * scale));
    int left = (CanvasWidth - width) / 2;
    int top = CanvasHeight - pad - height;
    var output = new Bitmap(CanvasWidth, CanvasHeight, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(output)) {
      g.Clear(Color.Transparent);
      g.CompositingMode = CompositingMode.SourceCopy;
      g.CompositingQuality = CompositingQuality.HighQuality;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.SmoothingMode = SmoothingMode.HighQuality;
      g.DrawImage(image, new Rectangle(left, top, width, height), bounds, GraphicsUnit.Pixel);
    }
    Defringe(output);
    return output;
  }

  public static void Main(string[] args) {
    if (args.Length != 3) throw new ArgumentException("Usage: CleanCharacterAsset <sheet-front|cutout> <input> <output>");
    string mode = args[0];
    string input = args[1];
    string output = args[2];
    using (var source = new Bitmap(input))
    using (var working = ToArgb(source)) {
      if (mode == "cutout") RemoveConnectedBackground(working);
      else if (mode != "sheet-front") throw new ArgumentException("Unknown mode: " + mode);
      Defringe(working);
      // The source sheet contains three poses, but the front pose extends slightly past one third.
      // Forty-two percent captures it completely while remaining safely before the side pose.
      int endX = mode == "sheet-front" ? (int)Math.Round(working.Width * 0.42) : working.Width;
      var bounds = FindBounds(working, 0, endX);
      Console.WriteLine("{0}: bounds {1},{2} {3}x{4}", Path.GetFileName(input), bounds.X, bounds.Y, bounds.Width, bounds.Height);
      using (var normalized = Normalize(working, bounds)) {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(output)));
        normalized.Save(output, ImageFormat.Png);
      }
    }
  }
}
