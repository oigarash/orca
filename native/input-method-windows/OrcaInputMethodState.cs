using System;
using System.Globalization;
using System.Runtime.InteropServices;

internal static class OrcaInputMethodState
{
    private const uint WmImeControl = 0x0283;
    private const uint ImcGetOpenStatus = 0x0005;
    private const uint SmtoBlock = 0x0001;
    private const uint SmtoAbortIfHung = 0x0002;
    private const uint QueryTimeoutMilliseconds = 250;
    private const ushort LangJapanese = 0x0011;

    [StructLayout(LayoutKind.Sequential)]
    private struct GuiThreadInfo
    {
        public uint cbSize;
        public uint flags;
        public IntPtr hwndActive;
        public IntPtr hwndFocus;
        public IntPtr hwndCapture;
        public IntPtr hwndMenuOwner;
        public IntPtr hwndMoveSize;
        public IntPtr hwndCaret;
        public Rect rcCaret;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect
    {
        public int left;
        public int top;
        public int right;
        public int bottom;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetGUIThreadInfo(uint threadId, ref GuiThreadInfo info);

    [DllImport("user32.dll")]
    private static extern IntPtr GetKeyboardLayout(uint threadId);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SendMessageTimeout(
        IntPtr window,
        uint message,
        UIntPtr wParam,
        IntPtr lParam,
        uint flags,
        uint timeout,
        out UIntPtr result
    );

    [DllImport("imm32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool ImmIsIME(IntPtr keyboardLayout);

    [DllImport("imm32.dll")]
    private static extern IntPtr ImmGetDefaultIMEWnd(IntPtr window);

    private static int Main(string[] args)
    {
        IntPtr rootWindow;
        if (args.Length != 1 || !TryParseWindowHandle(args[0], out rootWindow))
        {
            Console.WriteLine("unknown");
            return 1;
        }

        Console.WriteLine(ReadState(rootWindow));
        return 0;
    }

    private static string ReadState(IntPtr rootWindow)
    {
        uint ignoredProcessId;
        uint rootThreadId = GetWindowThreadProcessId(rootWindow, out ignoredProcessId);
        if (rootThreadId == 0)
        {
            return "unknown";
        }

        GuiThreadInfo threadInfo = new GuiThreadInfo();
        threadInfo.cbSize = (uint)Marshal.SizeOf(typeof(GuiThreadInfo));
        IntPtr focusedWindow = GetGUIThreadInfo(rootThreadId, ref threadInfo)
            && threadInfo.hwndFocus != IntPtr.Zero
            ? threadInfo.hwndFocus
            : rootWindow;
        uint focusedThreadId = GetWindowThreadProcessId(focusedWindow, out ignoredProcessId);
        if (focusedThreadId == 0)
        {
            return "unknown";
        }

        IntPtr keyboardLayout = GetKeyboardLayout(focusedThreadId);
        if (!ImmIsIME(keyboardLayout))
        {
            return "inactive";
        }

        IntPtr imeWindow = ImmGetDefaultIMEWnd(focusedWindow);
        if (imeWindow == IntPtr.Zero)
        {
            return "unknown";
        }
        UIntPtr openStatus;
        IntPtr sent = SendMessageTimeout(
            imeWindow,
            WmImeControl,
            new UIntPtr(ImcGetOpenStatus),
            IntPtr.Zero,
            SmtoBlock | SmtoAbortIfHung,
            QueryTimeoutMilliseconds,
            out openStatus
        );
        if (sent == IntPtr.Zero)
        {
            return "unknown";
        }
        if (openStatus == UIntPtr.Zero)
        {
            return "inactive";
        }

        ushort languageId = unchecked((ushort)(keyboardLayout.ToInt64() & 0xffff));
        ushort primaryLanguage = unchecked((ushort)(languageId & 0x03ff));
        return primaryLanguage == LangJapanese ? "active" : "unknown";
    }

    private static bool TryParseWindowHandle(string value, out IntPtr handle)
    {
        handle = IntPtr.Zero;
        string digits = value.StartsWith("0x", StringComparison.OrdinalIgnoreCase)
            ? value.Substring(2)
            : value;
        ulong numericHandle;
        if (!ulong.TryParse(digits, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out numericHandle)
            || numericHandle == 0)
        {
            return false;
        }
        handle = IntPtr.Size == 8
            ? new IntPtr(unchecked((long)numericHandle))
            : new IntPtr(unchecked((int)numericHandle));
        return true;
    }
}
