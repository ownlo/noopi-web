Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class YutCutout {
  public static void Run(string source, string output, string preview, bool checker = false) {
    using (var input = new Bitmap(source))
    using (var result = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb)) {
      int transparent = 0;
      for (int y = 0; y < input.Height; y++) for (int x = 0; x < input.Width; x++) {
        var c = input.GetPixel(x,y);
        // The source background is navy. Preserve bright blue fur and purple fur
        // by measuring both brightness and departure from the navy hue.
        double signal = Math.Max(c.R - 23, Math.Max(c.G - 26, c.B - 63));
        signal = Math.Max(signal, (c.R - c.G) * 2 - 12);
        if (checker) signal = Math.Max(Math.Max(c.R,Math.Max(c.G,c.B))-Math.Min(c.R,Math.Min(c.G,c.B))-8, 170-Math.Min(c.R,Math.Min(c.G,c.B)));
        int a = (int)Math.Round(255 * Math.Max(0, Math.Min(1, signal / 22)));
        if (a == 0) transparent++;
        result.SetPixel(x,y,Color.FromArgb(a,c.R,c.G,c.B));
      }
      // Keep small enclosed dark details (eyes, eyebrows and mouth) opaque.
      var visited = new bool[input.Width * input.Height];
      var queue = new int[visited.Length];
      for (int sy = 0; sy < input.Height; sy++) for (int sx = 0; sx < input.Width; sx++) {
        int start = sy * input.Width + sx;
        if (visited[start] || result.GetPixel(sx,sy).A == 255) continue;
        int head=0, tail=1; queue[0]=start; visited[start]=true;
        while(head<tail) {
          int p=queue[head++], x=p%input.Width, y=p/input.Width;
          int[] neighbors={x>0?p-1:-1,x+1<input.Width?p+1:-1,y>0?p-input.Width:-1,y+1<input.Height?p+input.Width:-1};
          foreach(int n in neighbors) if(n>=0 && !visited[n] && result.GetPixel(n%input.Width,n/input.Width).A<255) {visited[n]=true;queue[tail++]=n;}
        }
        if(tail<4000) for(int i=0;i<tail;i++) {int p=queue[i];result.SetPixel(p%input.Width,p/input.Width,input.GetPixel(p%input.Width,p/input.Width));}
      }
      result.Save(output, ImageFormat.Png);
      using(var white = new Bitmap(input.Width,input.Height)) {
        using(var g = Graphics.FromImage(white)) { g.Clear(Color.White); g.DrawImage(result,0,0); }
        white.Save(preview,ImageFormat.Png);
      }
      Console.WriteLine("Transparent pixels: " + transparent + "; format: " + result.PixelFormat);
    }
  }
}
'@
[YutCutout]::Run('C:\Users\owner\.codex\generated_images\01a0a3a5-dce2-7671-8149-7660046382e0\exec-c8c6ac16-ad09-4305-a1c8-b9b2b25d1493.png', 'D:\projects\noopi-web\src\assets\characters\noopi-yut-team-highfive.png', 'D:\projects\noopi-web\tmp\yut-team-preview.png', $true)
