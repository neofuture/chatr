import{j as n}from"./jsx-runtime-D_zvdyIk.js";import{S as f}from"./SimpleDualRangeSlider-Cc_tQBJN.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";const h={title:"Form Controls/SimpleDualRangeSlider",component:f,parameters:{layout:"centered",docs:{description:{component:"Simplified dual-handle range slider with a cleaner visual style."}}},tags:["autodocs"],decorators:[p=>n.jsx("div",{style:{width:320,padding:24},children:n.jsx(p,{})})]},e={args:{label:"Distance",min:0,max:100,defaultMinValue:10,defaultMaxValue:60,showValues:!0,valueSuffix:" km"}},a={args:{label:"Price",min:0,max:500,defaultMinValue:50,defaultMaxValue:300,showValues:!0,valuePrefix:"£",step:10}},r={args:{label:"Volume",min:0,max:100,defaultMinValue:20,defaultMaxValue:80,showValues:!0,valueSuffix:"%",error:"Range too narrow"}};var l,s,t;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    label: 'Distance',
    min: 0,
    max: 100,
    defaultMinValue: 10,
    defaultMaxValue: 60,
    showValues: true,
    valueSuffix: ' km'
  }
}`,...(t=(s=e.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};var o,u,i;a.parameters={...a.parameters,docs:{...(o=a.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    label: 'Price',
    min: 0,
    max: 500,
    defaultMinValue: 50,
    defaultMaxValue: 300,
    showValues: true,
    valuePrefix: '£',
    step: 10
  }
}`,...(i=(u=a.parameters)==null?void 0:u.docs)==null?void 0:i.source}}};var m,d,c;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    label: 'Volume',
    min: 0,
    max: 100,
    defaultMinValue: 20,
    defaultMaxValue: 80,
    showValues: true,
    valueSuffix: '%',
    error: 'Range too narrow'
  }
}`,...(c=(d=r.parameters)==null?void 0:d.docs)==null?void 0:c.source}}};const M=["Default","PriceRange","WithError"];export{e as Default,a as PriceRange,r as WithError,M as __namedExportsOrder,h as default};
