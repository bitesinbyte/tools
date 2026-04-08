using Microsoft.AspNetCore.Components;
using MudBlazor;
using System.Net;

namespace BitesInByte.Tools.Pages.Other;

public partial class EncodeDecode
{
    private bool isBase64Encode = true;
    private bool isUrlEncode = true;
    private bool isHtmlEncode = true;

    private string base64EncodeDecode = string.Empty;
    private string base64EncodeDecodeResult = string.Empty;

    private string urlEncodeDecode = string.Empty;
    private string urlEncodeDecodeResult = string.Empty;

    private string htmlEncodeDecode = string.Empty;
    private string htmlEncodeDecodeResult = string.Empty;

    [Inject]
    private ISnackbar Snackbar { get; set; } = null!;

    private void HandleBase64Convert()
    {
        try
        {
            if (isBase64Encode)
            {
                var plainTextBytes = System.Text.Encoding.UTF8.GetBytes(base64EncodeDecode);
                base64EncodeDecodeResult = System.Convert.ToBase64String(plainTextBytes);
                return;
            }
            var base64EncodedBytes = System.Convert.FromBase64String(base64EncodeDecode);
            base64EncodeDecodeResult = System.Text.Encoding.UTF8.GetString(base64EncodedBytes);
        }
        catch
        {
            Snackbar.Add("Something went wrong, please check your input.", Severity.Error);
        }
    }

    private void HandleUrlConvert()
    {
        try
        {
            if (isUrlEncode)
            {
                urlEncodeDecodeResult = Uri.EscapeDataString(urlEncodeDecode);
                return;
            }
            urlEncodeDecodeResult = Uri.UnescapeDataString(urlEncodeDecode);
        }
        catch
        {
            Snackbar.Add("Something went wrong, please check your input.", Severity.Error);
        }
    }

    private void HandleHtmlConvert()
    {
        try
        {
            if (isHtmlEncode)
            {
                htmlEncodeDecodeResult = WebUtility.HtmlEncode(htmlEncodeDecode);
                return;
            }
            htmlEncodeDecodeResult = WebUtility.HtmlDecode(htmlEncodeDecode) ?? string.Empty;
        }
        catch
        {
            Snackbar.Add("Something went wrong, please check your input.", Severity.Error);
        }
    }
}
