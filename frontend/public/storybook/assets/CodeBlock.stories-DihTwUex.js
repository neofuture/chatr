import{C as w}from"./CodeBlock-DmY3Wqj3.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";const k={title:"Messaging/CodeBlock",component:w,parameters:{layout:"centered",docs:{description:{component:"Syntax-highlighted code block with copy-to-clipboard button and language label."}}},tags:["autodocs"]},n={args:{lang:"javascript",content:`function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('world');`}},e={args:{lang:"python",content:`def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

for num in fibonacci(10):
    print(num)`}},a={args:{lang:"typescript",content:`interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
};`}},r={args:{lang:"json",content:`{
  "name": "chatr",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0"
  }
}`}},t={args:{lang:"",content:`some raw text
that has no specific
language highlighting`}};var s,o,c;n.parameters={...n.parameters,docs:{...(s=n.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    lang: 'javascript',
    content: \`function greet(name) {
  console.log(\\\`Hello, \\\${name}!\\\`);
}

greet('world');\`
  }
}`,...(c=(o=n.parameters)==null?void 0:o.docs)==null?void 0:c.source}}};var i,g,p;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    lang: 'python',
    content: \`def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

for num in fibonacci(10):
    print(num)\`
  }
}`,...(p=(g=e.parameters)==null?void 0:g.docs)==null?void 0:p.source}}};var m,d,l;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    lang: 'typescript',
    content: \`interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  const res = await fetch(\\\`/api/users/\\\${id}\\\`);
  return res.json();
};\`
  }
}`,...(l=(d=a.parameters)==null?void 0:d.docs)==null?void 0:l.source}}};var u,h,f;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    lang: 'json',
    content: \`{
  "name": "chatr",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0"
  }
}\`
  }
}`,...(f=(h=r.parameters)==null?void 0:h.docs)==null?void 0:f.source}}};var b,y,S;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    lang: '',
    content: \`some raw text
that has no specific
language highlighting\`
  }
}`,...(S=(y=t.parameters)==null?void 0:y.docs)==null?void 0:S.source}}};const J=["JavaScript","Python","TypeScript","JSON","UnknownLanguage"];export{r as JSON,n as JavaScript,e as Python,a as TypeScript,t as UnknownLanguage,J as __namedExportsOrder,k as default};
