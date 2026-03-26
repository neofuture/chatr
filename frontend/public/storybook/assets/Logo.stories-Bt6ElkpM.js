import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{r as _}from"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";const n=typeof process<"u"&&"Chatr"||"Chatr";function x({size:y="md",variant:j="horizontal"}){const E={sm:{width:120,height:40,fontSize:"1.25rem"},md:{width:180,height:60,fontSize:"1.75rem"},lg:{width:240,height:80,fontSize:"2.25rem"}},[w,H]=_.useState(!1),{width:s,height:i,fontSize:L}=E[y],N=j==="vertical"?"/images/logo-vertical.png":"/images/logo-horizontal.png";return w?e.jsx("div",{className:"flex items-center justify-center",style:{width:s,height:i},children:e.jsx("span",{style:{fontSize:L,fontWeight:700,color:"#3b82f6",letterSpacing:"-0.02em"},children:n})}):e.jsx("div",{className:"flex items-center justify-center",children:e.jsx("img",{src:N,alt:n,width:s,height:i,className:"logo-image",onError:()=>H(!0)})})}x.__docgenInfo={description:"",methods:[],displayName:"Logo",props:{size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'horizontal' | 'vertical'",elements:[{name:"literal",value:"'horizontal'"},{name:"literal",value:"'vertical'"}]},description:"",defaultValue:{value:"'horizontal'",computed:!1}}}};const M={title:"UI/Logo",component:x,tags:["autodocs"],parameters:{backgrounds:{default:"dark"},docs:{description:{component:"Chatr logo in horizontal or vertical orientation at three sizes."}}},argTypes:{size:{control:"radio",options:["sm","md","lg"]},variant:{control:"radio",options:["horizontal","vertical"]}}},r={args:{size:"md",variant:"horizontal"}},a={args:{size:"sm",variant:"horizontal"}},t={args:{size:"lg",variant:"horizontal"}},o={args:{size:"md",variant:"vertical"}};var l,c,m;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    size: 'md',
    variant: 'horizontal'
  }
}`,...(m=(c=r.parameters)==null?void 0:c.docs)==null?void 0:m.source}}};var d,p,g;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    size: 'sm',
    variant: 'horizontal'
  }
}`,...(g=(p=a.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var u,z,h;t.parameters={...t.parameters,docs:{...(u=t.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    size: 'lg',
    variant: 'horizontal'
  }
}`,...(h=(z=t.parameters)==null?void 0:z.docs)==null?void 0:h.source}}};var v,f,S;o.parameters={...o.parameters,docs:{...(v=o.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    size: 'md',
    variant: 'vertical'
  }
}`,...(S=(f=o.parameters)==null?void 0:f.docs)==null?void 0:S.source}}};const b=["HorizontalMd","HorizontalSm","HorizontalLg","Vertical"];export{t as HorizontalLg,r as HorizontalMd,a as HorizontalSm,o as Vertical,b as __namedExportsOrder,M as default};
