using BitesInByte.Tools.Models;
using BlazorMonaco.Editor;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using System.Text.Json;
using System.Text.Unicode;

namespace BitesInByte.Tools.Pages.Validators
{
    public partial class JsonFormatorAndValidator
    {
        [CascadingParameter]
        public LayoutConfig LayoutConfig { get; set; }
        public string Json { get; set; }
        public string FormattedJson { get; set; }
        private StandaloneCodeEditor _editor = null!;
        [Inject]
        public ISnackbar Snackbar { get; set; }
        private StandaloneEditorConstructionOptions EditorConstructionOptions(StandaloneCodeEditor editor)
        {
            return new StandaloneEditorConstructionOptions
            {
                GlyphMargin = true,
                Language = "json",
                AutoIndent = "true",
                FormatOnPaste = true,
                FormatOnType = true,
                DetectIndentation = true,
                WrappingIndent = "true",
                Theme = LayoutConfig.IsDarkMode ? "vs-dark" : "vs"
            };
        }

        private async Task HandleFormat()
        {
            bool isInvalid = false;
            try
            {
                Json = await _editor.GetValue(true);
                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Create(UnicodeRanges.All)
                };

                var jsonDocument = JsonDocument.Parse(Json);

                // Serialize the object into a formatted JSON string
                FormattedJson = JsonSerializer.Serialize(jsonDocument.RootElement, options);

            }
            catch (JsonException ex)
            {
                FormattedJson = ex.GetBaseException().Message;
                Snackbar.Add("Invaid JSON", Severity.Warning);
                isInvalid = true;
            }
            catch (ArgumentException ex)
            {
                FormattedJson = ex.GetBaseException().Message;
                Snackbar.Add("Invaid JSON", Severity.Warning);
                isInvalid = true;
            }
            catch (Exception ex)
            {
                FormattedJson = ex.Message;
                Snackbar.Add("Invaid JSON", Severity.Warning);
                isInvalid = true;
            }
            if (!isInvalid)
            {
                Snackbar.Add("Valid JSON", Severity.Success);
            }
            await _editor.SetValue(FormattedJson);
        }
    }
}
