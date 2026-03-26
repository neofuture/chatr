import{R as f}from"./Radio-BfrSzIvQ.js";import"./jsx-runtime-EKYJJIwR.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";const S={title:"Form Controls/Radio",component:f,tags:["autodocs"],argTypes:{label:{control:"text"},error:{control:"text"}}},g=[{value:"dark",label:"Dark Mode"},{value:"light",label:"Light Mode"},{value:"system",label:"System Default"}],e={args:{label:"Appearance",name:"theme",options:g}},a={args:{label:"Notification frequency",name:"freq",defaultValue:"daily",options:[{value:"realtime",label:"Real-time"},{value:"daily",label:"Daily digest"},{value:"weekly",label:"Weekly summary"},{value:"never",label:"Never"}]}},l={args:{label:"Subscription plan",name:"plan",options:[{value:"free",label:"Free"},{value:"pro",label:"Pro"},{value:"enterprise",label:"Enterprise (contact sales)",disabled:!0}]}},r={args:{label:"Gender",name:"gender",error:"Please select an option",options:[{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other / Prefer not to say"}]}};var n,t,o;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    label: 'Appearance',
    name: 'theme',
    options: themeOptions
  }
}`,...(o=(t=e.parameters)==null?void 0:t.docs)==null?void 0:o.source}}};var s,i,p;a.parameters={...a.parameters,docs:{...(s=a.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    label: 'Notification frequency',
    name: 'freq',
    defaultValue: 'daily',
    options: [{
      value: 'realtime',
      label: 'Real-time'
    }, {
      value: 'daily',
      label: 'Daily digest'
    }, {
      value: 'weekly',
      label: 'Weekly summary'
    }, {
      value: 'never',
      label: 'Never'
    }]
  }
}`,...(p=(i=a.parameters)==null?void 0:i.docs)==null?void 0:p.source}}};var m,u,c;l.parameters={...l.parameters,docs:{...(m=l.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    label: 'Subscription plan',
    name: 'plan',
    options: [{
      value: 'free',
      label: 'Free'
    }, {
      value: 'pro',
      label: 'Pro'
    }, {
      value: 'enterprise',
      label: 'Enterprise (contact sales)',
      disabled: true
    }]
  }
}`,...(c=(u=l.parameters)==null?void 0:u.docs)==null?void 0:c.source}}};var d,b,v;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    label: 'Gender',
    name: 'gender',
    error: 'Please select an option',
    options: [{
      value: 'male',
      label: 'Male'
    }, {
      value: 'female',
      label: 'Female'
    }, {
      value: 'other',
      label: 'Other / Prefer not to say'
    }]
  }
}`,...(v=(b=r.parameters)==null?void 0:b.docs)==null?void 0:v.source}}};const k=["Default","WithDefault","WithDisabledOption","WithError"];export{e as Default,a as WithDefault,l as WithDisabledOption,r as WithError,k as __namedExportsOrder,S as default};
