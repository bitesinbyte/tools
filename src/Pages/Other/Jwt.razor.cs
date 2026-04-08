using Microsoft.AspNetCore.Components;
using MudBlazor;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using System.Text.Unicode;

namespace BitesInByte.Tools.Pages.Other;

public partial class Jwt
{
    private string? headerText;
    private string? payloadText;

    [Inject]
    private ISnackbar Snackbar { get; set; } = null!;

    private void HandleJwtChange(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwtDecoded = handler.ReadToken(token) as JwtSecurityToken;
            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Create(UnicodeRanges.All)
            };

            headerText = JsonSerializer.Serialize(jwtDecoded?.Header, options);
            payloadText = JsonSerializer.Serialize(jwtDecoded?.Payload, options);
        }
        catch
        {
            Snackbar.Add("Invalid JWT", Severity.Error);
        }
    }
}
