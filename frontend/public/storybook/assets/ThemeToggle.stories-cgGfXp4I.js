import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{u as j,T as x}from"./ThemeContext-VTc29vLE.js";import{r as n}from"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";const f="_toggleLoading_n7mlh_1",b={toggleLoading:f};function a({showLabel:t=!0,compact:h=!1}){const{theme:o,toggleTheme:p}=j(),[u,y]=n.useState(!1);return n.useEffect(()=>{y(!0)},[]),u?e.jsxs("button",{onClick:p,className:`theme-toggle${h?" theme-toggle-compact":""}`,"aria-label":`Switch to ${o==="dark"?"light":"dark"} mode`,children:[e.jsx("div",{className:"theme-toggle-track",children:e.jsx("div",{className:"theme-toggle-thumb",children:o==="dark"?e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"})}):e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("circle",{cx:"12",cy:"12",r:"5"}),e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"3"}),e.jsx("line",{x1:"12",y1:"21",x2:"12",y2:"23"}),e.jsx("line",{x1:"4.22",y1:"4.22",x2:"5.64",y2:"5.64"}),e.jsx("line",{x1:"18.36",y1:"18.36",x2:"19.78",y2:"19.78"}),e.jsx("line",{x1:"1",y1:"12",x2:"3",y2:"12"}),e.jsx("line",{x1:"21",y1:"12",x2:"23",y2:"12"}),e.jsx("line",{x1:"4.22",y1:"19.78",x2:"5.64",y2:"18.36"}),e.jsx("line",{x1:"18.36",y1:"5.64",x2:"19.78",y2:"4.22"})]})})}),t&&e.jsxs("span",{className:"theme-toggle-label",children:[o==="dark"?"Dark":"Light"," Mode"]})]}):e.jsxs("div",{className:`theme-toggle ${b.toggleLoading}`,children:[e.jsx("div",{className:"theme-toggle-track",children:e.jsx("div",{className:"theme-toggle-thumb"})}),t&&e.jsx("span",{className:"theme-toggle-label",children:"Loading..."})]})}a.__docgenInfo={description:"",methods:[],displayName:"ThemeToggle",props:{showLabel:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}},compact:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const w={title:"Utility/ThemeToggle",component:a,tags:["autodocs"],parameters:{docs:{description:{component:"Toggle switch that switches between dark and light themes via ThemeContext."}}},decorators:[t=>e.jsx(x,{children:e.jsx(t,{})})]},s={},r={render:()=>e.jsx(x,{children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"1rem",padding:"0.75rem 1rem",background:"#1e293b",borderRadius:"8px"},children:[e.jsx("span",{style:{color:"#94a3b8",fontSize:"0.875rem"},children:"App toolbar"}),e.jsx("div",{style:{marginLeft:"auto"},children:e.jsx(a,{})})]})})};var l,i,d;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:"{}",...(d=(i=s.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};var c,m,g;r.parameters={...r.parameters,docs:{...(c=r.parameters)==null?void 0:c.docs,source:{originalSource:`{
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
}`,...(g=(m=r.parameters)==null?void 0:m.docs)==null?void 0:g.source}}};const L=["Default","InToolbar"];export{s as Default,r as InToolbar,L as __namedExportsOrder,w as default};
