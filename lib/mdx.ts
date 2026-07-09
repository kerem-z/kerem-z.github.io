import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
};
