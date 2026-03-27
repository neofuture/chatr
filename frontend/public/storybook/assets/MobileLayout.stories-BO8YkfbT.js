import{j as t}from"./jsx-runtime-D_zvdyIk.js";const r={title:"Layout/MobileLayout",parameters:{layout:"fullscreen",docs:{description:{component:`
**MobileLayout** is the top-level authenticated shell for mobile viewports.

It provides:
- Auth guard — reads \`token\` and \`user\` from localStorage, redirects to \`/\` if missing
- Bottom navigation bar with Chats, Groups, Settings tabs
- Profile avatar in the nav bar, updated via \`profileImageUpdated\` custom events
- PanelContainer overlay for slide-in panels
- ToastContainer for notifications

This component manages its own auth state internally and cannot be rendered in isolation without a full Next.js / auth context. Use the live app at \`/app\` on a mobile viewport to preview it.
        `.trim()}}},tags:["autodocs"]},e={render:()=>t.jsxs("div",{style:{padding:32,color:"#94a3b8",fontFamily:"system-ui",maxWidth:560},children:[t.jsx("h2",{style:{color:"#f1f5f9",marginBottom:12},children:"MobileLayout"}),t.jsx("p",{children:"This is a full-page authenticated layout component. It requires Next.js navigation and localStorage auth context."}),t.jsx("p",{style:{marginTop:12},children:"To preview: open the app on a mobile viewport (≤768 px) while authenticated."}),t.jsxs("ul",{style:{marginTop:12,lineHeight:2},children:[t.jsxs("li",{children:["Auth guard — redirects unauthenticated users to ",t.jsx("code",{children:"/"})]}),t.jsx("li",{children:"Bottom tab bar — Chats / Groups / Settings"}),t.jsx("li",{children:"Live profile avatar synced via custom events"}),t.jsx("li",{children:"Stackable panel overlay (PanelContainer)"}),t.jsx("li",{children:"Global toast notifications (ToastContainer)"})]})]})};var a,o,n;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: 32,
    color: '#94a3b8',
    fontFamily: 'system-ui',
    maxWidth: 560
  }}>
      <h2 style={{
      color: '#f1f5f9',
      marginBottom: 12
    }}>MobileLayout</h2>
      <p>This is a full-page authenticated layout component. It requires Next.js navigation and localStorage auth context.</p>
      <p style={{
      marginTop: 12
    }}>To preview: open the app on a mobile viewport (≤768 px) while authenticated.</p>
      <ul style={{
      marginTop: 12,
      lineHeight: 2
    }}>
        <li>Auth guard — redirects unauthenticated users to <code>/</code></li>
        <li>Bottom tab bar — Chats / Groups / Settings</li>
        <li>Live profile avatar synced via custom events</li>
        <li>Stackable panel overlay (PanelContainer)</li>
        <li>Global toast notifications (ToastContainer)</li>
      </ul>
    </div>
}`,...(n=(o=e.parameters)==null?void 0:o.docs)==null?void 0:n.source}}};const s=["Documentation"];export{e as Documentation,s as __namedExportsOrder,r as default};
