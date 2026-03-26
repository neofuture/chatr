import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{T as m}from"./ThemeContext-Bg5mVwRy.js";import{T as p}from"./ThemeToggle-B1gkywte.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";const b={title:"Utility/ThemeToggle",component:p,tags:["autodocs"],parameters:{docs:{description:{component:"Toggle switch that switches between dark and light themes via ThemeContext."}}},decorators:[c=>e.jsx(m,{children:e.jsx(c,{})})]},r={},o={render:()=>e.jsx(m,{children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"1rem",padding:"0.75rem 1rem",background:"#1e293b",borderRadius:"8px"},children:[e.jsx("span",{style:{color:"#94a3b8",fontSize:"0.875rem"},children:"App toolbar"}),e.jsx("div",{style:{marginLeft:"auto"},children:e.jsx(p,{})})]})})};var t,s,a;r.parameters={...r.parameters,docs:{...(t=r.parameters)==null?void 0:t.docs,source:{originalSource:"{}",...(a=(s=r.parameters)==null?void 0:s.docs)==null?void 0:a.source}}};var n,i,d;o.parameters={...o.parameters,docs:{...(n=o.parameters)==null?void 0:n.docs,source:{originalSource:`{
  render: () => <ThemeProvider>
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1rem',
      background: '#1e293b',
      borderRadius: '8px'
    }}>
        <span style={{
        color: '#94a3b8',
        fontSize: '0.875rem'
      }}>App toolbar</span>
        <div style={{
        marginLeft: 'auto'
      }}>
          <ThemeToggle />
        </div>
      </div>
    </ThemeProvider>
}`,...(d=(i=o.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};const f=["Default","InToolbar"];export{r as Default,o as InToolbar,f as __namedExportsOrder,b as default};
