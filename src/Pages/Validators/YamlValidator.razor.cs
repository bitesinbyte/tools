using BitesInByte.Tools.Models;
using BitesInByte.Tools.Models.SchemaStore;
using BlazorMonaco.Editor;
using Json.Schema;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using MudBlazor;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace BitesInByte.Tools.Pages.Validators;

public partial class YamlValidator
{
    [CascadingParameter]
    public LayoutConfig LayoutConfig { get; set; } = null!;
    private IEnumerable<string> Schemas { get; set; } = new List<string>();
    private IEnumerable<Schema> AllSchemas { get; set; } = new List<Schema>();
    private string SchemaValue { get; set; } = string.Empty;
    private Schema? SelectedSchema { get; set; }

    [Inject]
    private ISnackbar Snackbar { get; set; } = null!;

    [Inject]
    private IJSRuntime JSRuntime { get; set; } = null!;

    [Inject]
    private HttpClient Http { get; set; } = null!;


    private StandaloneCodeEditor _editor = null!;
    private StandaloneEditorConstructionOptions EditorConstructionOptions(StandaloneCodeEditor editor)
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
            Theme = LayoutConfig.IsDarkMode ? "vs-dark" : "vs"
        };
    }

    private async Task HandleValidate()
    {
        if (string.IsNullOrEmpty(SchemaValue))
        {
            Snackbar.Add("Please Select a Schema", Severity.Error);
            return;
        }
        SelectedSchema = AllSchemas.FirstOrDefault(x => x.Name.Equals(SchemaValue, StringComparison.OrdinalIgnoreCase));
        var input = await _editor.GetValue();
        if (string.IsNullOrEmpty(input))
        {
            Snackbar.Add("Unable to find the yaml", Severity.Error);
            return;
        }

        try
        {
            var schema = await File.ReadAllTextAsync("json_catalog.json");
            var deserializerBuilder = new DeserializerBuilder();
            var deserializer = deserializerBuilder
                .WithNamingConvention(CamelCaseNamingConvention.Instance)
                .Build();
            var yamlObject = deserializer.Deserialize<object>(input);
            var serializeObject = JsonSerializer.Serialize(yamlObject);

            var mySchema = JsonSchema.FromText(schema);

            var jsonNode = JsonNode.Parse(serializeObject);
            var results = mySchema.Evaluate(jsonNode?.AsValue().GetValue<JsonElement>() ?? default);
            if (!results.IsValid)
            {
                Snackbar.Add("Invalid YAML", Severity.Error);
                return;
            }
            Snackbar.Add("Valid YAML", Severity.Success);
        }
        catch
        {
            Snackbar.Add("Something went wrong!!", Severity.Error);
        }
    }

    private async Task<IEnumerable<string>> AutoCompleteSchema(string value, CancellationToken cancellationToken)
    {
        await InitializeSchemaAsync();
        if (string.IsNullOrEmpty(value))
            return Schemas;
        return Schemas.Where(x => x.Contains(value, StringComparison.InvariantCultureIgnoreCase));
    }

    private async Task HandleOpenSchema()
    {
        if (string.IsNullOrEmpty(SchemaValue))
        {
            Snackbar.Add("Please Select a Schema", Severity.Error);
            return;
        }
        Snackbar.Add("Please allow popups", Severity.Info);
        SelectedSchema = AllSchemas.FirstOrDefault(x => x.Name.Equals(SchemaValue, StringComparison.OrdinalIgnoreCase));
        await JSRuntime.InvokeVoidAsync("open", SelectedSchema?.Url, "_blank");
    }

    private async Task InitializeSchemaAsync()
    {
        try
        {
            var catalog = await Http.GetFromJsonAsync<JsonCatalog>("json_catalog.json");
            if (catalog is not null)
            {
                AllSchemas = catalog.Schemas;
                Schemas = catalog.Schemas.Select(x => x.Name);
            }
        }
        catch (Exception ex)
        {
            Snackbar.Add(ex.Message, Severity.Error);
        }
    }
}
