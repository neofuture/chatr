import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as M}from"./index-CAPI2NOD.js";import{C as m}from"./Calendar-CW1dY7JW.js";import"./_commonjsHelpers-Cpj98o6Y.js";const E={title:"Form Controls/Calendar",component:m,parameters:{layout:"centered",docs:{description:{component:"Full calendar date/time picker. Supports date-only, time-only, and date+time modes."}}},tags:["autodocs"]};function c(e){const[n,d]=M.useState(void 0);return r.jsx(m,{...e,value:n,onChange:d})}const a={render:e=>r.jsx(c,{...e}),args:{mode:"date"}},t={render:e=>r.jsx(c,{...e}),args:{mode:"time"}},o={render:e=>r.jsx(c,{...e}),args:{mode:"datetime"}},s={render:e=>{const[n,d]=M.useState(new Date("2026-06-15T14:30:00"));return r.jsx(m,{...e,value:n,onChange:d})},args:{mode:"date"}};var l,u,i;a.parameters={...a.parameters,docs:{...(l=a.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: args => <Controlled {...args} />,
  args: {
    mode: 'date'
  }
}`,...(i=(u=a.parameters)==null?void 0:u.docs)==null?void 0:i.source}}};var p,g,C;t.parameters={...t.parameters,docs:{...(p=t.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: args => <Controlled {...args} />,
  args: {
    mode: 'time'
  }
}`,...(C=(g=t.parameters)==null?void 0:g.docs)==null?void 0:C.source}}};var x,D,S;o.parameters={...o.parameters,docs:{...(x=o.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: args => <Controlled {...args} />,
  args: {
    mode: 'datetime'
  }
}`,...(S=(D=o.parameters)==null?void 0:D.docs)==null?void 0:S.source}}};var j,f,v;s.parameters={...s.parameters,docs:{...(j=s.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<Date | undefined>(new Date('2026-06-15T14:30:00'));
    return <Calendar {...args} value={value} onChange={setValue} />;
  },
  args: {
    mode: 'date'
  }
}`,...(v=(f=s.parameters)==null?void 0:f.docs)==null?void 0:v.source}}};const w=["DateMode","TimeMode","DateTimeMode","WithPreselectedDate"];export{a as DateMode,o as DateTimeMode,t as TimeMode,s as WithPreselectedDate,w as __namedExportsOrder,E as default};
