import Cocoa
import ApplicationServices

let owner = pid_t(CommandLine.arguments.dropFirst().first.flatMap(Int32.init) ?? 0)
var targetApp: NSRunningApplication?
var targetElement: AXUIElement?
var targetRange: CFTypeRef?
var enabled = false
var inserting = false
func attribute(_ element: AXUIElement, _ key: String) -> CFTypeRef? {
    var value: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, key as CFString, &value) == .success ? value : nil
}
func focused(_ pid: pid_t) -> AXUIElement? {
    guard let value = attribute(AXUIElementCreateApplication(pid), kAXFocusedUIElementAttribute), CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
    return unsafeBitCast(value, to: AXUIElement.self)
}
func editable(_ element: AXUIElement) -> Bool {
    let role = attribute(element, kAXRoleAttribute) as? String ?? ""
    let subrole = attribute(element, kAXSubroleAttribute) as? String ?? ""
    return ["AXTextArea", "AXTextField", "AXComboBox"].contains(role) && subrole != "AXSecureTextField" && (attribute(element, kAXEnabledAttribute) as? Bool ?? true)
}
func capture() {
    guard enabled, !inserting, let front = NSWorkspace.shared.frontmostApplication, front.processIdentifier != owner, front.processIdentifier != getpid() else { return }
    targetApp = front
    targetElement = nil; targetRange = nil
    guard AXIsProcessTrusted(), let element = focused(front.processIdentifier), editable(element) else { return }
    targetElement = element
    targetRange = attribute(element, kAXSelectedTextRangeAttribute)
}
func reply(_ id: String, _ ok: Bool, _ error: String = "", _ extra: [String: Any] = [:]) {
    var result = extra; result["id"] = id; result["ok"] = ok; result["error"] = error
    if let data = try? JSONSerialization.data(withJSONObject: result), let json = String(data: data, encoding: .utf8) { print(json); fflush(stdout) }
}
func handle(_ request: [String: Any]) {
    let id = request["id"] as? String ?? ""
    switch request["action"] as? String {
    case "enable":
        enabled = request["enabled"] as? Bool ?? false
        if !enabled { targetApp = nil; targetElement = nil; targetRange = nil }
        reply(id, true)
    case "permission":
        let trusted = AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary)
        reply(id, true, "", ["permitted": trusted])
    case "status": reply(id, true, "", ["permitted": AXIsProcessTrusted(), "target": targetElement == nil ? "" : targetApp?.localizedName ?? ""])
    case "insert":
        guard enabled, !inserting else { reply(id, false, "直接插入未开启或仍在处理中"); return }
        guard AXIsProcessTrusted() else { reply(id, false, "请在系统设置中允许辅助功能权限；提示词已复制"); return }
        guard let app = targetApp, !app.isTerminated, let element = targetElement, editable(element) else { reply(id, false, "请先点击目标应用的文本输入框，再打开快速面板；提示词已复制"); return }
        inserting = true
        let range = targetRange
        // Activation never sends Return or submits the target conversation.
        app.activate(options: [.activateIgnoringOtherApps])
        _ = AXUIElementSetAttributeValue(AXUIElementCreateApplication(app.processIdentifier), kAXFrontmostAttribute as CFString, kCFBooleanTrue)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            defer { inserting = false }
            guard NSWorkspace.shared.frontmostApplication?.processIdentifier == app.processIdentifier else { reply(id, false, "无法切回目标应用；请手动粘贴"); return }
            _ = AXUIElementSetAttributeValue(element, kAXFocusedAttribute as CFString, kCFBooleanTrue)
            guard let current = focused(app.processIdentifier), CFEqual(current, element), editable(current) else { reply(id, false, "目标输入框已失效，未执行粘贴"); return }
            if let range = range { _ = AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, range) }
            guard let down = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: true), let up = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: false) else { reply(id, false, "无法生成粘贴按键"); return }
            down.flags = .maskCommand; up.flags = .maskCommand
            down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap)
            reply(id, true)
        }
    default: reply(id, false, "未知操作")
    }
}
let timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in capture() }
DispatchQueue.global().async {
    while let line = readLine() {
        guard let data = line.data(using: .utf8), let request = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { continue }
        DispatchQueue.main.async { handle(request) }
    }
    exit(0)
}
RunLoop.main.run()
