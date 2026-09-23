// Native mouse input for the Electron drag smoke test (screen coordinates in points).
import Cocoa

let args = CommandLine.arguments
func post(_ type: CGEventType, _ point: CGPoint) {
    let event = CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: point, mouseButton: .left)
    event?.post(tap: .cghidEventTap)
}
if args.count == 4 && args[1] == "move" {
    post(.mouseMoved, CGPoint(x: Double(args[2])!, y: Double(args[3])!))
} else if args.count == 6 && args[1] == "drag" {
    let from = CGPoint(x: Double(args[2])!, y: Double(args[3])!)
    let to = CGPoint(x: Double(args[4])!, y: Double(args[5])!)
    post(.mouseMoved, from)
    usleep(150_000)
    post(.leftMouseDown, from)
    usleep(200_000)
    for step in 1...30 {
        let t = CGFloat(step) / 30
        post(.leftMouseDragged, CGPoint(x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t))
        usleep(20_000)
    }
    post(.leftMouseUp, to)
    usleep(150_000)
} else {
    fputs("Usage: native-orb-drag move x y | drag fromX fromY toX toY\n", stderr)
    exit(1)
}
