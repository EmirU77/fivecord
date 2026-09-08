Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\asus\.gemini\antigravity\scratch\fivecord"
WshShell.Run "node_modules\electron\dist\electron.exe desktop\main.cjs", 0, False