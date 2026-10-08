param([int]$OwnerPid)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -ReferencedAssemblies UIAutomationClient,UIAutomationTypes,WindowsBase -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Automation;
public static class PromptInsert {
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
 [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hwnd);
 [DllImport("user32.dll")] static extern uint SendInput(uint count, INPUT[] inputs, int size);
 [StructLayout(LayoutKind.Sequential)] struct KEYBD { public ushort vk, scan; public uint flags, time; public UIntPtr extra; }
 [StructLayout(LayoutKind.Sequential)] struct MOUSE { public int x,y; public uint data,flags,time; public UIntPtr extra; }
 [StructLayout(LayoutKind.Explicit)] struct UNION { [FieldOffset(0)] public KEYBD keyboard; [FieldOffset(0)] public MOUSE mouse; }
 [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION data; }
 static AutomationElement target;
 static IntPtr targetWindow;
 public static bool Enabled;
 public static readonly System.Collections.Concurrent.ConcurrentQueue<string> Lines = new System.Collections.Concurrent.ConcurrentQueue<string>();
 public static volatile bool InputClosed;
 public static void StartReader() {
  var reader = new Thread(() => { try { string line; while((line=Console.ReadLine())!=null) Lines.Enqueue(line); } finally { InputClosed=true; } });
  reader.IsBackground=true; reader.Start();
 }
 public static string Name = "";
 static bool Editable(AutomationElement e) {
  if(e == null) return false;
  var c=e.Current;
  return c.IsEnabled && c.IsKeyboardFocusable && !c.IsPassword && (c.ControlType==ControlType.Edit || c.ControlType==ControlType.Document || c.ControlType==ControlType.ComboBox);
 }
 public static void Clear() { target=null; targetWindow=IntPtr.Zero; Name=""; }
 public static void Capture(int owner) {
  if(!Enabled) return;
  try {
   var hwnd=GetForegroundWindow(); uint pid; GetWindowThreadProcessId(hwnd,out pid);
   if(pid==owner || pid==System.Diagnostics.Process.GetCurrentProcess().Id) return;
   targetWindow=hwnd; target=null; Name="";
   var focus=AutomationElement.FocusedElement;
   if(Editable(focus)) { target=focus; Name=System.Diagnostics.Process.GetProcessById((int)pid).ProcessName; }
  } catch { Clear(); }
 }
 static INPUT Key(ushort code,bool up) { var i=new INPUT(); i.type=1; i.data.keyboard=new KEYBD{vk=code,flags=up?2u:0u}; return i; }
 public static string Insert() {
  if(!Enabled || target==null || !IsWindow(targetWindow)) return "请先点击目标输入框，再打开快速面板；提示词已复制";
  try {
   if(!Editable(target)) return "目标输入框已失效；提示词已复制";
   if(!SetForegroundWindow(targetWindow)) return "Windows 未允许切换目标窗口，请手动粘贴";
   Thread.Sleep(200);
   target.SetFocus(); Thread.Sleep(100);
   if(GetForegroundWindow()!=targetWindow || !Automation.Compare(AutomationElement.FocusedElement,target)) return "目标焦点已变化，未执行粘贴";
   var keys=new[]{Key(0x11,false),Key(0x56,false),Key(0x56,true),Key(0x11,true)};
   if(SendInput(4,keys,Marshal.SizeOf(typeof(INPUT)))!=4) { SendInput(1,new[]{Key(0x11,true)},Marshal.SizeOf(typeof(INPUT)));return "无法粘贴；目标可能以管理员权限运行，请手动粘贴"; }
   return "";
  } catch { return "无法访问目标输入框，请手动粘贴"; }
 }
}
'@
[PromptInsert]::StartReader()
while ($true) {
 [PromptInsert]::Capture($OwnerPid)
 [string]$line = ''
 if ([PromptInsert]::Lines.TryDequeue([ref]$line)) {
  try {
   $request = $line | ConvertFrom-Json
   $result = @{ id=$request.id; ok=$true; permitted=$true; target=[PromptInsert]::Name }
   switch ($request.action) {
    'enable' { [PromptInsert]::Enabled=[bool]$request.enabled; if(-not $request.enabled){[PromptInsert]::Clear()} }
    'status' {}
    'permission' {}
    'insert' { $errorText=[PromptInsert]::Insert(); if($errorText){$result.ok=$false;$result.error=$errorText} }
    default { $result.ok=$false;$result.error='未知操作' }
   }
   [Console]::WriteLine(($result | ConvertTo-Json -Compress))
  } catch { [Console]::WriteLine((@{id=$request.id;ok=$false;error='插入助手发生错误'}|ConvertTo-Json -Compress)) }
 } elseif ([PromptInsert]::InputClosed) { break }
 Start-Sleep -Milliseconds 100
}
