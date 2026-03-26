import{j as t}from"./jsx-runtime-EKYJJIwR.js";import{D as h}from"./DualRangeSlider-r8zkOi3O.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";const w={title:"Form Controls/DualRangeSlider",component:h,parameters:{layout:"centered",docs:{description:{component:"Dual-handle range slider for selecting a min/max value range."}}},tags:["autodocs"],decorators:[s=>t.jsx("div",{style:{width:320,padding:24},children:t.jsx(s,{})})]},e={args:{label:"Price Range",min:0,max:1e3,defaultMinValue:200,defaultMaxValue:800,showValues:!0,valuePrefix:"£",onChange:(s,M)=>console.log(s,M)}},a={args:{label:"Age Range",min:18,max:100,defaultMinValue:25,defaultMaxValue:50,showValues:!0,valueSuffix:" yrs"}},r={args:{label:"Match Percentage",min:0,max:100,defaultMinValue:40,defaultMaxValue:90,showValues:!0,valueSuffix:"%",step:5}},n={args:{label:"Budget",min:0,max:500,defaultMinValue:100,defaultMaxValue:400,showValues:!0,valuePrefix:"$",error:"Range must be at least £50 apart"}};var l,u,o;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    label: 'Price Range',
    min: 0,
    max: 1000,
    defaultMinValue: 200,
    defaultMaxValue: 800,
    showValues: true,
    valuePrefix: '£',
    onChange: (min, max) => console.log(min, max)
  }
}`,...(o=(u=e.parameters)==null?void 0:u.docs)==null?void 0:o.source}}};var i,m,c;a.parameters={...a.parameters,docs:{...(i=a.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    label: 'Age Range',
    min: 18,
    max: 100,
    defaultMinValue: 25,
    defaultMaxValue: 50,
    showValues: true,
    valueSuffix: ' yrs'
  }
}`,...(c=(m=a.parameters)==null?void 0:m.docs)==null?void 0:c.source}}};var d,g,f;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    label: 'Match Percentage',
    min: 0,
    max: 100,
    defaultMinValue: 40,
    defaultMaxValue: 90,
    showValues: true,
    valueSuffix: '%',
    step: 5
  }
}`,...(f=(g=r.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var p,x,V;n.parameters={...n.parameters,docs:{...(p=n.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    label: 'Budget',
    min: 0,
    max: 500,
    defaultMinValue: 100,
    defaultMaxValue: 400,
    showValues: true,
    valuePrefix: '$',
    error: 'Range must be at least £50 apart'
  }
}`,...(V=(x=n.parameters)==null?void 0:x.docs)==null?void 0:V.source}}};const D=["Default","AgeRange","Percentage","WithError"];export{a as AgeRange,e as Default,r as Percentage,n as WithError,D as __namedExportsOrder,w as default};
