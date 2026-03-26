import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{S as o}from"./Select-DTU8KNmV.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";const T={title:"Form Controls/Select",component:o,tags:["autodocs"],argTypes:{label:{control:"text"},error:{control:"text"},disabled:{control:"boolean"}}},t={render:()=>e.jsxs(o,{children:[e.jsx("option",{value:"",children:"Select a country…"}),e.jsx("option",{value:"gb",children:"United Kingdom"}),e.jsx("option",{value:"us",children:"United States"}),e.jsx("option",{value:"ca",children:"Canada"}),e.jsx("option",{value:"au",children:"Australia"})]})},n={render:()=>e.jsxs(o,{label:"Country",children:[e.jsx("option",{value:"",children:"Choose…"}),e.jsx("option",{value:"gb",children:"United Kingdom"}),e.jsx("option",{value:"us",children:"United States"})]})},r={render:()=>e.jsxs(o,{label:"Timezone",error:"Please select a timezone",children:[e.jsx("option",{value:"",children:"Select timezone…"}),e.jsx("option",{value:"utc",children:"UTC"}),e.jsx("option",{value:"gmt",children:"GMT+1"})]})},a={render:()=>e.jsx(o,{label:"Region (locked)",disabled:!0,children:e.jsx("option",{value:"eu",children:"Europe"})})};var i,l,s;t.parameters={...t.parameters,docs:{...(i=t.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => <Select>
      <option value="">Select a country…</option>
      <option value="gb">United Kingdom</option>
      <option value="us">United States</option>
      <option value="ca">Canada</option>
      <option value="au">Australia</option>
    </Select>
}`,...(s=(l=t.parameters)==null?void 0:l.docs)==null?void 0:s.source}}};var c,d,p;n.parameters={...n.parameters,docs:{...(c=n.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: () => <Select label="Country">
      <option value="">Choose…</option>
      <option value="gb">United Kingdom</option>
      <option value="us">United States</option>
    </Select>
}`,...(p=(d=n.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};var u,m,v;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  render: () => <Select label="Timezone" error="Please select a timezone">
      <option value="">Select timezone…</option>
      <option value="utc">UTC</option>
      <option value="gmt">GMT+1</option>
    </Select>
}`,...(v=(m=r.parameters)==null?void 0:m.docs)==null?void 0:v.source}}};var S,h,x;a.parameters={...a.parameters,docs:{...(S=a.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => <Select label="Region (locked)" disabled>
      <option value="eu">Europe</option>
    </Select>
}`,...(x=(h=a.parameters)==null?void 0:h.docs)==null?void 0:x.source}}};const z=["Default","WithLabel","WithError","Disabled"];export{t as Default,a as Disabled,r as WithError,n as WithLabel,z as __namedExportsOrder,T as default};
