using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class DefringeAvatarLayer {
  static bool NearTransparency(Bitmap image, int x, int y, int radius) {
    for (int yy = Math.Max(0, y - radius); yy <= Math.Min(image.Height - 1, y + radius); yy++) {
      for (int xx = Math.Max(0, x - radius); xx <= Math.Min(image.Width - 1, x + radius); xx++) {
        if (image.GetPixel(xx, yy).A < 12) return true;
      }
    }
    return false;
  }

  static Color InteriorColor(Bitmap image, int x, int y, Color fallback) {
    for (int radius = 1; radius <= 7; radius++) {
      for (int yy = Math.Max(0, y - radius); yy <= Math.Min(image.Height - 1, y + radius); yy++) {
        for (int xx = Math.Max(0, x - radius); xx <= Math.Min(image.Width - 1, x + radius); xx++) {
          var candidate = image.GetPixel(xx, yy);
          if (candidate.A >= 250 && !NearTransparency(image, xx, yy, 2)) return candidate;
        }
      }
    }
    return fallback;
  }

  static bool IsGeneratedColorFringe(Color color) {
    bool yellow = color.R > 170 && color.G > 115 && color.B < 95;
    bool red = color.R > 170 && color.G < 105 && color.B < 105;
    bool green = color.G > 145 && color.G > color.R * 1.25 && color.G > color.B * 1.25;
    return yellow || red || green;
  }

  public static void Main(string[] args) {
    if (args.Length != 2) throw new ArgumentException("Usage: DefringeAvatarLayer <input> <output>");
    using (var source = new Bitmap(args[0])) {
      var image = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
      using (var graphics = Graphics.FromImage(image)) graphics.DrawImageUnscaled(source, 0, 0);

      for (int pass = 0; pass < 2; pass++) {
        var removals = new List<Point>();
        for (int y = 0; y < image.Height; y++) {
          for (int x = 0; x < image.Width; x++) {
            var color = image.GetPixel(x, y);
            if (color.A > 0 && IsGeneratedColorFringe(color) && NearTransparency(image, x, y, 2)) removals.Add(new Point(x, y));
          }
        }
        foreach (var point in removals) image.SetPixel(point.X, point.Y, Color.Transparent);
      }

      var updates = new List<Tuple<int, int, Color>>();
      for (int y = 0; y < image.Height; y++) {
        for (int x = 0; x < image.Width; x++) {
          var color = image.GetPixel(x, y);
          if (color.A == 0 || color.A >= 250 || !NearTransparency(image, x, y, 2)) continue;
          var interior = InteriorColor(image, x, y, color);
          updates.Add(Tuple.Create(x, y, Color.FromArgb(color.A, interior.R, interior.G, interior.B)));
        }
      }
      foreach (var update in updates) image.SetPixel(update.Item1, update.Item2, update.Item3);
      image.Save(args[1], ImageFormat.Png);
      image.Dispose();
    }
  }
}
