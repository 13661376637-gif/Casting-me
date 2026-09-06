using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class AvatarLayerGenerator {
  const int W = 512;
  const int H = 1280;

  static Bitmap Normalize(string path) {
    using (var src = new Bitmap(path)) {
      var dst = new Bitmap(W, H, PixelFormat.Format32bppArgb);
      using (var g = Graphics.FromImage(dst)) {
        g.Clear(Color.Transparent);
        g.CompositingMode = CompositingMode.SourceCopy;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        int width = (int)Math.Round(src.Width * (H / (double)src.Height));
        int left = (W - width) / 2;
        g.DrawImage(src, new Rectangle(left, 0, width, H));
      }
      return dst;
    }
  }

  static bool InFace(int x, int y) {
    double dx = (x - 256) / 74.0;
    double dy = (y - 150) / 92.0;
    return dx * dx + dy * dy <= 1.0;
  }

  static bool IsSkin(Color c) {
    return c.A > 0 && c.R > 105 && c.R > c.G * 1.03 && c.G > c.B * 1.05 && c.B > 45;
  }

  static bool IsDark(Color c) {
    return c.A > 12 && ((c.R * 3 + c.G * 4 + c.B) / 8) < 150;
  }

  static bool[,] BuildHairMask(Bitmap src) {
    var mask = new bool[W, H];
    var queue = new Queue<Point>();
    for (int y = 0; y < 170; y++) {
      for (int x = 0; x < W; x++) {
        if (!mask[x, y] && IsDark(src.GetPixel(x, y))) {
          mask[x, y] = true;
          queue.Enqueue(new Point(x, y));
        }
      }
    }
    while (queue.Count > 0) {
      var p = queue.Dequeue();
      for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
          if (dx == 0 && dy == 0) continue;
          int nx = p.X + dx;
          int ny = p.Y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H || ny > 470 || mask[nx, ny]) continue;
          if (!IsDark(src.GetPixel(nx, ny))) continue;
          mask[nx, ny] = true;
          queue.Enqueue(new Point(nx, ny));
        }
      }
    }
    return mask;
  }

  static Color NearestOpaque(Bitmap bmp, int x, int y, Color fallback) {
    for (int radius = 1; radius <= 3; radius++) {
      for (int yy = Math.Max(0, y - radius); yy <= Math.Min(H - 1, y + radius); yy++) {
        for (int xx = Math.Max(0, x - radius); xx <= Math.Min(W - 1, x + radius); xx++) {
          var c = bmp.GetPixel(xx, yy);
          if (c.A >= 245) return c;
        }
      }
    }
    return fallback;
  }

  static void Defringe(Bitmap bmp) {
    for (int y = 0; y < H; y++) {
      for (int x = 0; x < W; x++) {
        var c = bmp.GetPixel(x, y);
        if (c.A == 0) continue;
        if (c.A < 245) {
          var n = NearestOpaque(bmp, x, y, c);
          bmp.SetPixel(x, y, Color.FromArgb(c.A, n.R, n.G, n.B));
        }
      }
    }
  }

  static void SaveBase(string sourcePath, string outputPath) {
    using (var src = Normalize(sourcePath)) {
      var hair = BuildHairMask(src);
      var dst = new Bitmap(W, H, PixelFormat.Format32bppArgb);
      for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
          var c = src.GetPixel(x, y);
          if (c.A == 0) continue;
          bool skin = IsSkin(c);
          bool faceAndNeck = y < 250 && (InFace(x, y) || (y >= 170 && x >= 190 && x <= 322));
          bool body = y >= 250;
          bool outerHairBand = y < 400 && (x < 190 || x > 322) && !skin;
          if (skin || faceAndNeck || (body && !outerHairBand)) dst.SetPixel(x, y, c);
        }
      }
      Defringe(dst);
      dst.Save(outputPath, ImageFormat.Png);
      dst.Dispose();
    }
  }

  static void SaveHair(string sourcePath, string backPath, string frontPath) {
    using (var src = Normalize(sourcePath)) {
      var hair = BuildHairMask(src);
      var back = new Bitmap(W, H, PixelFormat.Format32bppArgb);
      var front = new Bitmap(W, H, PixelFormat.Format32bppArgb);
      for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
          var c = src.GetPixel(x, y);
          if (!hair[x, y] || y > 470) continue;
          bool face = InFace(x, y);
          bool outerSide = x < 155 || x > 357;
          bool sideLock = y < 290 && (x < 195 || x > 317);
          bool topMass = y < 145;
          if (!face && (outerSide || sideLock || topMass)) back.SetPixel(x, y, c);
          bool frontFringe = y < 235 && !face && (x < 190 || x > 322 || y < 82);
          if (frontFringe) front.SetPixel(x, y, c);
        }
      }
      Defringe(back);
      Defringe(front);
      back.Save(backPath, ImageFormat.Png);
      front.Save(frontPath, ImageFormat.Png);
      back.Dispose();
      front.Dispose();
    }
  }

  public static void Main(string[] args) {
    string sourceDir = args[0];
    string outputDir = args[1];
    System.IO.Directory.CreateDirectory(outputDir);
    SaveBase(System.IO.Path.Combine(sourceDir, "lin-original.png"), System.IO.Path.Combine(outputDir, "body-face.png"));
    string[] keys = { "original", "sleek", "bob", "pony" };
    foreach (var key in keys) {
      string src = System.IO.Path.Combine(sourceDir, "lin-" + key + ".png");
      SaveHair(src, System.IO.Path.Combine(outputDir, "hair-back-" + key + ".png"), System.IO.Path.Combine(outputDir, "hair-front-" + key + ".png"));
    }
  }
}
