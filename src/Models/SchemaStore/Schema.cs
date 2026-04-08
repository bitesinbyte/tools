using System.Text.Json.Serialization;

namespace BitesInByte.Tools.Models.SchemaStore;

public class Schema
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("fileMatch")]
    public List<string> FileMatch { get; set; } = [];

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}
