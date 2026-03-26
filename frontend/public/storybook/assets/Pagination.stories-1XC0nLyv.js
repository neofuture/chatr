import{f as r}from"./index-aA1Q6uWB.js";import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{r as v}from"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";const W="_bar_1mg7g_1",z="_label_1mg7g_18",H="_controls_1mg7g_22",J="_btnIcon_1mg7g_59 _btn_1mg7g_29",K="_btnNav_1mg7g_66 _btn_1mg7g_29",Q="_pageTrackClip_1mg7g_72",Y="_pageTrack_1mg7g_72",Z="_btnPage_1mg7g_102 _btn_1mg7g_29",ee="_btnPageActive_1mg7g_113 _btnPage_1mg7g_102 _btn_1mg7g_29",a={bar:W,label:z,controls:H,btnIcon:J,btnNav:K,pageTrackClip:Q,pageTrack:Y,btnPage:Z,btnPageActive:ee},b=2,f=.35,ae=b+f;function O({currentPage:n,totalPages:s,onPageChange:o,label:B,visibleCount:P=5}){const g=P*b+(P-1)*f,{translateX:G,fadeEdge:U}=v.useMemo(()=>{const c=(g-b)/2-(n-1)*ae,h=g-(s*b+(s-1)*f),_=Math.min(0,Math.max(h,c)),x=_>=0,N=_<=h;return{translateX:_,fadeEdge:x&&N?"none":x?"start":N?"end":"both"}},[n,s,g]),V=v.useMemo(()=>{const t=[];for(let c=1;c<=s;c++)t.push(c);return t},[s]);return s<=1?null:e.jsxs("div",{className:a.bar,children:[e.jsx("span",{className:a.label,children:B||`Page ${n} of ${s}`}),e.jsxs("div",{className:a.controls,children:[e.jsx("button",{onClick:()=>o(1),disabled:n===1,className:a.btnIcon,title:"First page",children:e.jsx("i",{className:"fas fa-angles-left"})}),e.jsxs("button",{onClick:()=>o(n-1),disabled:n===1,className:a.btnNav,children:[e.jsx("i",{className:"fas fa-chevron-left",style:{marginRight:"0.25rem"}})," Prev"]}),e.jsx("div",{className:a.pageTrackClip,"data-fade":U,style:{width:`${g}rem`},children:e.jsx("div",{className:a.pageTrack,style:{transform:`translateX(${G}rem)`},children:V.map(t=>e.jsx("button",{onClick:()=>o(t),className:t===n?a.btnPageActive:a.btnPage,children:t},t))})}),e.jsxs("button",{onClick:()=>o(n+1),disabled:n===s,className:a.btnNav,children:["Next ",e.jsx("i",{className:"fas fa-chevron-right",style:{marginLeft:"0.25rem"}})]}),e.jsx("button",{onClick:()=>o(s),disabled:n===s,className:a.btnIcon,title:"Last page",children:e.jsx("i",{className:"fas fa-angles-right"})})]})]})}O.__docgenInfo={description:"",methods:[],displayName:"Pagination",props:{currentPage:{required:!0,tsType:{name:"number"},description:""},totalPages:{required:!0,tsType:{name:"number"},description:""},onPageChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(page: number) => void",signature:{arguments:[{type:{name:"number"},name:"page"}],return:{name:"void"}}},description:""},label:{required:!1,tsType:{name:"string"},description:""},visibleCount:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"5",computed:!1}}}};const ge={title:"UI/Pagination",component:O,parameters:{layout:"centered",docs:{description:{component:"Page navigation with first/prev/next/last buttons and numbered page links."}}},tags:["autodocs"]},i={args:{currentPage:1,totalPages:10,onPageChange:r()}},l={args:{currentPage:5,totalPages:10,onPageChange:r()}},m={args:{currentPage:10,totalPages:10,onPageChange:r()}},d={args:{currentPage:2,totalPages:3,onPageChange:r()}},p={args:{currentPage:3,totalPages:8,onPageChange:r(),label:"Results page 3 of 8"}},u={args:{currentPage:50,totalPages:100,onPageChange:r()}};var C,j,y;i.parameters={...i.parameters,docs:{...(C=i.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: fn()
  }
}`,...(y=(j=i.parameters)==null?void 0:j.docs)==null?void 0:y.source}}};var T,k,M;l.parameters={...l.parameters,docs:{...(T=l.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    currentPage: 5,
    totalPages: 10,
    onPageChange: fn()
  }
}`,...(M=(k=l.parameters)==null?void 0:k.docs)==null?void 0:M.source}}};var S,E,I;m.parameters={...m.parameters,docs:{...(S=m.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    currentPage: 10,
    totalPages: 10,
    onPageChange: fn()
  }
}`,...(I=(E=m.parameters)==null?void 0:E.docs)==null?void 0:I.source}}};var w,L,R;d.parameters={...d.parameters,docs:{...(w=d.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    currentPage: 2,
    totalPages: 3,
    onPageChange: fn()
  }
}`,...(R=(L=d.parameters)==null?void 0:L.docs)==null?void 0:R.source}}};var q,A,$;p.parameters={...p.parameters,docs:{...(q=p.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    currentPage: 3,
    totalPages: 8,
    onPageChange: fn(),
    label: 'Results page 3 of 8'
  }
}`,...($=(A=p.parameters)==null?void 0:A.docs)==null?void 0:$.source}}};var F,X,D;u.parameters={...u.parameters,docs:{...(F=u.parameters)==null?void 0:F.docs,source:{originalSource:`{
  args: {
    currentPage: 50,
    totalPages: 100,
    onPageChange: fn()
  }
}`,...(D=(X=u.parameters)==null?void 0:X.docs)==null?void 0:D.source}}};const ie=["Default","MiddlePage","LastPage","FewPages","CustomLabel","ManyPages"];export{p as CustomLabel,i as Default,d as FewPages,m as LastPage,u as ManyPages,l as MiddlePage,ie as __namedExportsOrder,ge as default};
