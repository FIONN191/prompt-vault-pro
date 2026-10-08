import Cocoa
let output = CommandLine.arguments[1]
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let menu = NSMenu()
let editItem = NSMenuItem(); let edit = NSMenu(title:"Edit")
edit.addItem(withTitle:"Paste",action:#selector(NSText.paste(_:)),keyEquivalent:"v")
editItem.submenu=edit;menu.addItem(editItem);app.mainMenu=menu
let window = NSWindow(contentRect: NSRect(x: 160,y: 220,width: 480,height: 240),styleMask:[.titled,.closable],backing:.buffered,defer:false)
window.title = "Prompt Vault insertion test"
let input = NSTextView(frame:NSRect(x:20,y:20,width:440,height:200))
input.isRichText = false
input.string = "before SELECT after"
input.setSelectedRange(NSRange(location:7,length:6))
window.contentView?.addSubview(input)
window.makeKeyAndOrderFront(nil)
window.makeFirstResponder(input)
app.activate(ignoringOtherApps:true)
class Delegate: NSObject, NSTextViewDelegate {
 var returns = 0
 func textView(_ textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
  if commandSelector == #selector(NSResponder.insertNewline(_:)) { returns += 1; return true }
  return false
 }
}
let delegate = Delegate(); input.delegate = delegate
let timer=Timer.scheduledTimer(withTimeInterval:0.1,repeats:true){_ in
 let data=try! JSONSerialization.data(withJSONObject:["text":input.string,"returns":delegate.returns])
 try? data.write(to:URL(fileURLWithPath:output),options:.atomic)
}
app.run()
