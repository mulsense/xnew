import CodeBlock from '@theme/CodeBlock';

export default function ShowCode({ code }) {
    return (
        <>
            <CodeBlock language='js'>{code}</CodeBlock>
        </>
    )
}