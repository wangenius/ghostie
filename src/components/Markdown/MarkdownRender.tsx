import ReactMarkdown, { Components } from "react-markdown";
import { CodeBlock } from "../custom/CodeBlock";
import { TbExternalLink } from "react-icons/tb";

export const MarkdownRender = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      components={{
        code: CodeBlock,
        a: CustomLink,
        h1: H1,
        h2: H2,
        h3: H3,
        h4: H4,
        h5: H5,
        h6: H6,
        p: CustomParagraph,
        ul: CustomUl,
        ol: CustomOl,
        li: CustomListItem,
        blockquote: CustomBlockquote,
        hr: CustomHr,
        table: CustomTable,
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

const CustomLink: Components["a"] = ({ href, children }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (href) {
      window.open(href, "_blank");
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-orange-800 hover:underline"
    >
      {children}
      <TbExternalLink className="inline-block" />
    </a>
  );
};

const H1: Components["h1"] = ({ children }) => {
  return <h1 className="text-2xl font-bold">{children}</h1>;
};

const H2: Components["h2"] = ({ children }) => {
  return <h2 className="text-xl font-bold">{children}</h2>;
};

const H3: Components["h3"] = ({ children }) => {
  return <h3 className="text-lg font-bold">{children}</h3>;
};

const H4: Components["h4"] = ({ children }) => {
  return <h4 className="text-base font-bold">{children}</h4>;
};

const H5: Components["h5"] = ({ children }) => {
  return <h5 className="text-sm font-bold">{children}</h5>;
};

const H6: Components["h6"] = ({ children }) => {
  return <h6 className="text-xs font-bold">{children}</h6>;
};

const CustomParagraph: Components["p"] = ({ children }) => {
  return (
    <p className="my-2 text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </p>
  );
};

const CustomUl: Components["ul"] = ({ children }) => {
  return (
    <ul className={`my-2 ml-6 list-disc text-gray-700 dark:text-gray-300`}>
      {children}
    </ul>
  );
};

const CustomOl: Components["ol"] = ({ children }) => {
  return (
    <ol className={`my-2 ml-6 list-decimal text-gray-700 dark:text-gray-300`}>
      {children}
    </ol>
  );
};

const CustomListItem: Components["li"] = ({ children }) => {
  return <li className="my-0.5">{children}</li>;
};

const CustomBlockquote: Components["blockquote"] = ({ children }) => {
  return (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-600 dark:text-gray-400">
      {children}
    </blockquote>
  );
};

const CustomHr: Components["hr"] = () => {
  return <hr className="my-8 border-gray-300 dark:border-gray-600" />;
};

const CustomTable: Components["table"] = ({ children }) => {
  return (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
        {children}
      </table>
    </div>
  );
};
