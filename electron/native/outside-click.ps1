Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MouseState {
 [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
 [StructLayout(LayoutKind.Sequential)] public struct Point { public int X; public int Y; }
 [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point point);
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
'@
[MouseState]::SetProcessDPIAware() | Out-Null
$previous = 0
while ($true) {
 $current = 0
 foreach ($key in @(1,2,4)) { if (([MouseState]::GetAsyncKeyState($key) -band 0x8000) -ne 0) { $current = $current -bor $key } }
 if (($current -band (-bnot $previous)) -ne 0) {
  $point = New-Object MouseState+Point
  [MouseState]::GetCursorPos([ref]$point) | Out-Null
  [Console]::WriteLine('{"x":'+$point.X+',"y":'+$point.Y+'}')
 }
 $previous = $current
 Start-Sleep -Milliseconds 15
}
