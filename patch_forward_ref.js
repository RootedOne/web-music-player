const fs = require('fs');
const filepath = 'src/app/(main)/page.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  /Item: function VirtuosoItem\({ children, \.\.\.props }\) {[\s\S]*?return <div \{\.\.\.props\}>\{children\}<\/div>;[\s\S]*?}/m,
  `Item: React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(function VirtuosoItem({ children, ...props }, ref) {
                return <div ref={ref} {...props}>{children}</div>;
              })`
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('patched again');
