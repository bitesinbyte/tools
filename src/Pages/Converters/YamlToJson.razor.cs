using BitesInByte.Tools.Models;
using BlazorMonaco.Editor;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using System.Text.Json;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace BitesInByte.Tools.Pages.Converters
{
    public partial class YamlToJson
    {
        [CascadingParameter]
        public LayoutConfig LayoutConfig { get; set; }

        private StandaloneCodeEditor _editorJson = null!;
        private StandaloneCodeEditor _editorYaml = null!;
        [Inject]
        public ISnackbar Snackbar { get; set; }
        private StandaloneEditorConstructionOptions EditorConstructionOptionsJson(StandaloneCodeEditor editor)
        {
            return new StandaloneEditorConstructionOptions
            {
                GlyphMargin = true,
                Language = "json",
                AutoIndent = "true",
                FormatOnPaste = true,
                FormatOnType = true,
                DetectIndentation = true,
                ReadOnly = true,
                WrappingIndent = "true",
                Theme = LayoutConfig.IsDarkMode ? "vs-dark" : "vs"
            };
        }

        private StandaloneEditorConstructionOptions EditorConstructionOptionsYaml(StandaloneCodeEditor editor)
        {
            return new StandaloneEditorConstructionOptions
            {
                GlyphMargin = true,
                Language = "yaml",
                AutoIndent = "true",
                FormatOnPaste = true,
                FormatOnType = true,
                DetectIndentation = true,
                WrappingIndent = "true",
                ReadOnly = false,
                Theme = LayoutConfig.IsDarkMode ? "vs-dark" : "vs"
            };
        }

        public async Task HandleConvert()
        {
            try
            {
                var yaml = await _editorYaml.GetValue();
                if (string.IsNullOrEmpty(yaml))
                {
                    Snackbar.Add("Please enter json", Severity.Error);
                }

                var deserializerBuilder = new DeserializerBuilder();
                var deserializer = deserializerBuilder
                    .WithNamingConvention(CamelCaseNamingConvention.Instance)
                    .Build();
                var yamlObject = deserializer.Deserialize<object>(yaml);

                var serializeObject = JsonSerializer.Serialize(yamlObject, new JsonSerializerOptions
                {
                    WriteIndented = true
                });

                await _editorJson.SetValue(serializeObject);
            }
            catch
            {
                Snackbar.Add("Something went wrong!!", Severity.Error);
            }
        }
    }
}
