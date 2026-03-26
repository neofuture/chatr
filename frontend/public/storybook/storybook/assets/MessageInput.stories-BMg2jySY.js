import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{T as x}from"./ToastContext-9whTi6PI.js";import{P as v}from"./PanelContext-CXd8bETb.js";import{T as I}from"./ThemeContext-Bg5mVwRy.js";import{M as j}from"./MessageInput-Coo7BbeQ.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./VoiceRecorder-DnaI9Q9l.js";import"./Button-CgqB4DRV.js";import"./EmojiPicker-CfhMeKXb.js";import"./LinkPreviewCard-LVDt6hUj.js";import"./WebSocketContext-4ObXDOHj.js";import"./LogContext-Bo4N9L2a.js";import"./api-BCYJxCpV.js";import"./extractWaveform-MvnON043.js";import"./db-0SialWBz.js";const F={title:"Messaging/MessageInput",component:j,parameters:{layout:"fullscreen",docs:{description:{component:"Full chat input bar with text entry, emoji picker, file attachments, and voice recorder. Handles typing indicators and edit/reply modes."}}},tags:["autodocs"],decorators:[n=>e.jsx(I,{children:e.jsx(x,{children:e.jsx(v,{children:e.jsx("div",{style:{background:"#0f172a",padding:16,maxWidth:600},children:e.jsx(n,{})})})})})]},r={args:{isDark:!0,recipientId:"user-123",onMessageSent:n=>console.log("Sent:",n)}},s={args:{isDark:!0,recipientId:"user-123",replyingTo:{id:"msg-1",content:"Hey, want to meet up later?",senderId:"user-123",senderDisplayName:"Simon James",senderUsername:"@simonjames",recipientId:"current",direction:"received",type:"text",status:"delivered",timestamp:new Date,unsent:!1,edited:!1,reactions:[]},onCancelReply:()=>console.log("Reply cancelled")}},t={args:{isDark:!0,recipientId:"user-123",editingMessage:{id:"msg-2",content:"This is the original message text",senderId:"current",senderDisplayName:"Me",senderUsername:"@me",recipientId:"user-123",direction:"sent",type:"text",status:"delivered",timestamp:new Date,unsent:!1,edited:!1,reactions:[]},onCancelEdit:()=>console.log("Edit cancelled"),onEditSaved:(n,D)=>console.log("Edited:",n,D)}},a={args:{isDark:!1,recipientId:"user-123"},decorators:[n=>e.jsx(I,{children:e.jsx(x,{children:e.jsx(v,{children:e.jsx("div",{style:{background:"#f8fafc",padding:16,maxWidth:600},children:e.jsx(n,{})})})})})]};var i,o,d;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    isDark: true,
    recipientId: 'user-123',
    onMessageSent: msg => console.log('Sent:', msg)
  }
}`,...(d=(o=r.parameters)==null?void 0:o.docs)==null?void 0:d.source}}};var c,m,l;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    isDark: true,
    recipientId: 'user-123',
    replyingTo: {
      id: 'msg-1',
      content: 'Hey, want to meet up later?',
      senderId: 'user-123',
      senderDisplayName: 'Simon James',
      senderUsername: '@simonjames',
      recipientId: 'current',
      direction: 'received' as const,
      type: 'text',
      status: 'delivered',
      timestamp: new Date(),
      unsent: false,
      edited: false,
      reactions: []
    },
    onCancelReply: () => console.log('Reply cancelled')
  }
}`,...(l=(m=s.parameters)==null?void 0:m.docs)==null?void 0:l.source}}};var p,u,g;t.parameters={...t.parameters,docs:{...(p=t.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    isDark: true,
    recipientId: 'user-123',
    editingMessage: {
      id: 'msg-2',
      content: 'This is the original message text',
      senderId: 'current',
      senderDisplayName: 'Me',
      senderUsername: '@me',
      recipientId: 'user-123',
      direction: 'sent' as const,
      type: 'text',
      status: 'delivered',
      timestamp: new Date(),
      unsent: false,
      edited: false,
      reactions: []
    },
    onCancelEdit: () => console.log('Edit cancelled'),
    onEditSaved: (id, content) => console.log('Edited:', id, content)
  }
}`,...(g=(u=t.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var f,y,h;a.parameters={...a.parameters,docs:{...(f=a.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    isDark: false,
    recipientId: 'user-123'
  },
  decorators: [Story => <ThemeProvider>
        <ToastProvider>
          <PanelProvider>
            <div style={{
          background: '#f8fafc',
          padding: 16,
          maxWidth: 600
        }}>
              <Story />
            </div>
          </PanelProvider>
        </ToastProvider>
      </ThemeProvider>]
}`,...(h=(y=a.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};const O=["Default","InReplyMode","InEditMode","LightTheme"];export{r as Default,t as InEditMode,s as InReplyMode,a as LightTheme,O as __namedExportsOrder,F as default};
