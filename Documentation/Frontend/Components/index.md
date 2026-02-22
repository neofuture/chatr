# Components

All reusable UI components are located in `frontend/src/components/`. Each component lives in its own folder with an `index.md` reference document.

## Structure

```mermaid
graph LR
    messaging --> ChatView
    messaging --> MessageBubble
    messaging --> MessageAudioPlayer
    messaging --> VoiceRecorder
    messaging --> ChatInput
    messaging --> ChatMessageList
```

```mermaid
graph LR
    form-controls --> Button
    form-controls --> Input
    form-controls --> Select
    form-controls --> Textarea
    form-controls --> Checkbox
    form-controls --> Radio
    form-controls --> RangeSlider
    form-controls --> DualRangeSlider
    form-controls --> SimpleDualRangeSlider
    form-controls --> DatePicker
    form-controls --> Calendar
```

```mermaid
graph LR
    dialogs --> BottomSheet
    dialogs --> ConfirmationDialog
    dialogs --> Lightbox
```

```mermaid
graph LR
    image-manip --> ProfileImageUploader
    image-manip --> ProfileImageCropper
    image-manip --> CoverImageUploader
    image-manip --> CoverImageCropper
```

```mermaid
graph LR
    forms --> LoginForm
    forms --> LoginVerification
    forms --> EmailVerification
    forms --> ForgotPassword
```

```mermaid
graph LR
    panels --> PanelContainer
    panels --> AuthPanel
```

```mermaid
graph LR
    layout --> AppLayout
    layout --> MobileLayout
    layout --> BackgroundBlobs
```

```mermaid
graph LR
    utility --> Logo
    utility --> ThemeToggle
    utility --> ToastContainer
    utility --> ConnectionIndicator
    utility --> BurgerMenu
    utility --> RoutePreloader
```

```mermaid
graph LR
    test --> LabControls
    test --> LabActionControls
    test --> LabMessages
    test --> LabSystemLogs
    test --> ConversationsList
    test --> ConversationsColumn
    test --> SystemLogsModal
    test --> DragHandle
```

```mermaid
graph LR
    demo --> Demo2FA
    demo --> BottomSheetDemo
    demo --> WebSocketDemo
    demo --> WebSocketDebug
    demo --> DemoPanels
```

## Folders

| Folder | Description |
|---|---|
| [messaging](./messaging/index.md) | Message display, audio, voice recording, chat input |
| [form-controls](./form-controls/index.md) | Inputs, selects, sliders, date pickers |
| [dialogs](./dialogs/index.md) | Bottom sheet, confirmation dialog, lightbox |
| [image-manip](./image-manip/index.md) | Profile and cover image upload and crop |
| [forms](./forms/index.md) | Auth forms — login, register, verification |
| [panels](./panels/index.md) | Slide-in panel system |
| [layout](./layout/index.md) | App shell — desktop and mobile layouts |
| [utility](./utility/index.md) | Logo, theme toggle, toasts, connection indicator |
| [test](./test/index.md) | Test Lab components — conversations, messages, logs |
| [demo](./demo/index.md) | Dev/demo-only components |
