import { Typography, Stack, Link } from '@mui/material';
import PageHead from '../components/PageHead';

export default function PrivacyPolicy() {
  return (
    <>
      <PageHead title="Privacy Policy - BitesInByte" description="BitesInByte privacy statement and cookie policy." />
      <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', py: { xs: 2, md: 4 } }}>
        <Typography variant="h4">bitesinbyte Privacy Statement</Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>1. Acknowledgment and Acceptance of Terms</Typography>
        <Typography variant="body1" color="text.secondary">
          bitesinbyte is committed to protecting your privacy. This Privacy Statement sets forth our current privacy
          practices with regard to the information we collect when you or your computer interact with bitesinbyte.com.
          By accessing bitesinbyte.com, you acknowledge and fully understand our Privacy Statement and freely consent
          to the information collection and use practices described in this Website Privacy Statement.
        </Typography>

        <Typography variant="h6">2. Participating Clients, Merchant Policies, and Third Party Websites</Typography>
        <Typography variant="body1" color="text.secondary">
          Related services and offerings with links from this website, including all other websites, have their own
          privacy statements that can be viewed by clicking on the corresponding links within each respective website.
          All bitesinbyte advertising clients are encouraged to participate in industry privacy initiatives and to take
          a responsible attitude towards consumer privacy. bitesinbyte is not responsible for the privacy practices or
          contents of third-party or client websites. We recommend and encourage that you always review the privacy
          policies of merchants and other third parties before you provide any personal information or complete any
          transaction with such parties.
        </Typography>

        <Typography variant="h6">3. Information We Collect and How We Use It</Typography>
        <Typography variant="body1" color="text.secondary">
          bitesinbyte collects certain information from and about its users three ways: directly from our Web Server
          logs, the user, and with Cookies. When you visit our Website, we may track information to administer the
          site and analyze its usage for the purpose of serving our visitors and customers better. bitesinbyte reserves
          the right to use contact information collected through advertising campaigns and other methods for commercial
          marketing purposes.
        </Typography>

        <Typography variant="h6">3a. Tracking Pixels</Typography>
        <Typography variant="body1" color="text.secondary">
          This website uses Google Ads' free conversion tracking features on certain pages. If you contact us online,
          the destination page will have code on it that will help us understand the path you took to arrive on that
          page. We use Google Ads remarketing codes to log when users view specific pages or take specific actions on
          a website. This allows us to provide targeted advertising in the future. Microsoft Clarity: We partner with
          Microsoft Clarity and Microsoft Advertising to capture how you use and interact with our website through
          behavioral metrics, heatmaps, and session replay to improve and market our products/services. For more
          information about how Microsoft collects and uses your data, visit the{' '}
          <Link href="https://privacy.microsoft.com/privacystatement" target="_blank" sx={{ color: 'text.primary' }}>
            Microsoft Privacy Statement
          </Link>.
        </Typography>

        <Typography variant="h6">4. Cookie Policy</Typography>
        <Typography variant="body1" color="text.secondary">
          Cookies are files with a small amount of data, which may include an anonymous unique identifier. Cookies are
          sent to your browser from a website and stored on your computer's hard drive. Like many sites, we use
          "cookies" to collect information. You can instruct your browser to refuse all cookies or to indicate when a
          cookie is being sent. You may opt out of Google Analytics by visiting the{' '}
          <Link href="https://tools.google.com/dlpage/gaoptout" target="_blank" sx={{ color: 'text.primary' }}>
            Google Analytics Opt-out page
          </Link>.
        </Typography>

        <Typography variant="h6">5. Changes to This Statement</Typography>
        <Typography variant="body1" color="text.secondary">
          bitesinbyte has the discretion to occasionally update this privacy statement. We encourage you to
          periodically review this privacy statement to stay informed about how we are helping to protect the personal
          information we collect. If you have questions regarding our Privacy Statement, please{' '}
          <Link href="https://github.com/bitesinbyte/tools/discussions/categories/q-a" target="_blank" sx={{ color: 'text.primary' }}>
            contact us
          </Link>.
        </Typography>

        <Typography variant="h6">6. Google Disclosures</Typography>
        <Typography variant="body1" color="text.secondary">
          Read Google's advertiser guide to working with third parties{' '}
          <Link href="https://support.google.com/adspolicy/answer/9457109?hl=en" target="_blank" sx={{ color: 'text.primary' }}>
            here
          </Link>.
        </Typography>
      </Stack>
    </>
  );
}
