using Microsoft.AspNetCore.Components;
using MudBlazor;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using System.Text.Unicode;

namespace BitesInByte.Tools.Pages.Other;

public partial class Jwt
{
    private MudTextField<string> headerReference;
    private MudTextField<string> payoadReference;

    [Inject]
    private ISnackbar Snackbar { get; set; }
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

            var header = JsonSerializer.Serialize(jwtDecoded.Header, options);
            headerReference.SetText(header);

            var payload = JsonSerializer.Serialize(jwtDecoded.Payload, options);
            payoadReference.SetText(payload);
        }
        catch
        {
            Snackbar.Add("Invalid JWT", Severity.Error);
        }
    }
}
