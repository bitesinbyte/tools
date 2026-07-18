import { Helmet } from 'react-helmet-async';

interface PageHeadProps {
  title: string;
  description: string;
  noIndex?: boolean;
}

export default function PageHead({ title, description, noIndex = false }: PageHeadProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
