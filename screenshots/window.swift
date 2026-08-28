// Prints the id of the first on-screen window owned by <owner> to appear after launch. `screencapture
// -l` wants an id, and the popup's is minted when it opens, so it cannot be written down anywhere.
//
//     swift window.swift <owner-substring> [timeout-seconds]

import CoreGraphics
import Foundation

func windowIds(owner: String) -> Set<Int> {
    let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
    return Set(
        list
            .filter { ($0[kCGWindowOwnerName as String] as? String ?? "").lowercased().contains(owner) }
            .compactMap { $0[kCGWindowNumber as String] as? Int })
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("\(message)\n".data(using: .utf8)!)
    exit(1)
}

guard CommandLine.arguments.count >= 2 else {
    fail("usage: swift window.swift <owner-substring> [timeout-seconds]")
}

let owner = CommandLine.arguments[1].lowercased()
let timeout = CommandLine.arguments.count > 2 ? Double(CommandLine.arguments[2]) ?? 30 : 30

let baseline = windowIds(owner: owner)
if baseline.isEmpty {
    fail("no windows owned by anything matching '\(owner)' — is the browser running?")
}

let deadline = Date().addingTimeInterval(timeout)
while Date() < deadline {
    if let id = windowIds(owner: owner).subtracting(baseline).first {
        print(id)
        exit(0)
    }
    Thread.sleep(forTimeInterval: 0.1)
}

fail("nothing owned by '\(owner)' opened within \(Int(timeout))s")
