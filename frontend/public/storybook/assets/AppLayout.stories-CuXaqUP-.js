import{j as e}from"./jsx-runtime-D_zvdyIk.js";const i={title:"Layout/AppLayout",parameters:{layout:"fullscreen",docs:{description:{component:`
**AppLayout** is the root authenticated shell for desktop viewports.

It provides:
- Auth guard — reads \`token\` and \`user\` from localStorage, redirects to \`/\` if missing
- Fixed header with logo, navigation, theme toggle, and profile avatar
- BurgerMenu for secondary navigation
- PanelContainer overlay for slide-in panels
- ToastContainer and ConfirmationDialog globally
- RoutePreloader that prefetches all app routes on mount

This component cannot be rendered in isolation in Storybook — it requires Next.js navigation and full auth context. Use the live app at \`/app\` on a desktop viewport.
        `.trim()}}},tags:["autodocs"]},o={render:()=>e.jsxs("div",{style:{padding:32,color:"#94a3b8",fontFamily:"system-ui",maxWidth:640},children:[e.jsx("h2",{style:{color:"#f1f5f9",marginBottom:12},children:"AppLayout"}),e.jsx("p",{children:"Full-page authenticated layout for desktop (≥769 px). Cannot be isolated in Storybook."}),e.jsxs("ul",{style:{marginTop:12,lineHeight:2},children:[e.jsxs("li",{children:["Auth guard — redirects unauthenticated users to ",e.jsx("code",{children:"/"})]}),e.jsx("li",{children:"Header bar with logo, nav links, theme toggle, profile avatar"}),e.jsx("li",{children:"BurgerMenu for secondary nav"}),e.jsx("li",{children:"Stackable panel overlay (PanelContainer)"}),e.jsx("li",{children:"Global toast & confirmation dialogs"}),e.jsx("li",{children:"RoutePreloader — prefetches all app routes on mount"})]})]})};var t,a,n;o.parameters={...o.parameters,docs:{...(t=o.parameters)==null?void 0:t.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: 32,
    color: '#94a3b8',
    fontFamily: 'system-ui',
    maxWidth: 640
  }}>
      <h2 style={{
      color: '#f1f5f9',
      marginBottom: 12
    }}>AppLayout</h2>
      <p>Full-page authenticated layout for desktop (≥769 px). Cannot be isolated in Storybook.</p>
      <ul style={{
      marginTop: 12,
      lineHeight: 2
    }}>
        <li>Auth guard — redirects unauthenticated users to <code>/</code></li>
        <li>Header bar with logo, nav links, theme toggle, profile avatar</li>
        <li>BurgerMenu for secondary nav</li>
        <li>Stackable panel overlay (PanelContainer)</li>
        <li>Global toast &amp; confirmation dialogs</li>
        <li>RoutePreloader — prefetches all app routes on mount</li>
      </ul>
    </div>
}`,...(n=(a=o.parameters)==null?void 0:a.docs)==null?void 0:n.source}}};const l=["Documentation"];export{o as Documentation,l as __namedExportsOrder,i as default};
