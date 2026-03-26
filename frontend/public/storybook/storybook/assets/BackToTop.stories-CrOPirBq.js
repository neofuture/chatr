import{j as t}from"./jsx-runtime-EKYJJIwR.js";import{r as a}from"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";function r(){const[c,l]=a.useState(!1);return a.useEffect(()=>{const e=()=>l(window.scrollY>400);return window.addEventListener("scroll",e,{passive:!0}),()=>window.removeEventListener("scroll",e)},[]),c?t.jsx("button",{onClick:()=>window.scrollTo({top:0,behavior:"smooth"}),"aria-label":"Back to top",style:{position:"fixed",bottom:24,right:24,width:40,height:40,borderRadius:10,border:"1px solid var(--border-primary, rgba(59,130,246,0.3))",background:"var(--bg-secondary, rgba(15,23,42,0.95))",color:"var(--text-secondary, #94a3b8)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,backdropFilter:"blur(12px)",boxShadow:"0 4px 16px rgba(0,0,0,0.25)",zIndex:1e3,opacity:.85,transition:"opacity 0.2s, transform 0.2s"},onMouseEnter:e=>{e.currentTarget.style.opacity="1",e.currentTarget.style.transform="translateY(-2px)"},onMouseLeave:e=>{e.currentTarget.style.opacity="0.85",e.currentTarget.style.transform=""},children:t.jsx("i",{className:"fas fa-arrow-up","aria-hidden":"true"})}):null}r.__docgenInfo={description:"",methods:[],displayName:"BackToTop"};const m={title:"UI/BackToTop",component:r,parameters:{layout:"fullscreen",docs:{description:{component:"Floating button that scrolls the page to the top when clicked. Appears after scrolling down."}}},tags:["autodocs"]},o={render:()=>t.jsxs("div",{style:{height:2e3,background:"linear-gradient(to bottom, #0f172a, #1e293b)",padding:24},children:[t.jsx("p",{style:{color:"#94a3b8"},children:"Scroll down to see the Back to Top button appear."}),t.jsx(r,{})]})};var n,s,i;o.parameters={...o.parameters,docs:{...(n=o.parameters)==null?void 0:n.docs,source:{originalSource:`{
  render: () => <div style={{
    height: 2000,
    background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
    padding: 24
  }}>
      <p style={{
      color: '#94a3b8'
    }}>Scroll down to see the Back to Top button appear.</p>
      <BackToTop />
    </div>
}`,...(i=(s=o.parameters)==null?void 0:s.docs)==null?void 0:i.source}}};const g=["Default"];export{o as Default,g as __namedExportsOrder,m as default};
