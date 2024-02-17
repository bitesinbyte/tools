using System.Text.Json.Serialization;

namespace BitesInByte.Tools.Models.SchemaStore
{
    public class JsonCatalog
    {
        [JsonPropertyName("schemas")]
        public List<Schema> Schemas { get; set; }
    }
}
