using System.Collections;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using System.Text.Unicode;

namespace BitesInByte.Tools.Helpers;

public static class JsonHelpers
{
    public static JsonSerializerOptions GetJsonOptions()
    {
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Create(UnicodeRanges.All),
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
            TypeInfoResolver = new DefaultJsonTypeInfoResolver
            {
                Modifiers = { DefaultValueModifier }
            }
        };
        return options;
    }

    private static void DefaultValueModifier(JsonTypeInfo type_info)
    {
        foreach (var property in type_info.Properties)
        {
            if (typeof(ICollection).IsAssignableFrom(property.PropertyType))
            {
                property.ShouldSerialize = (_, val) => val is ICollection collection && collection.Count > 0;
            }
        }
    }

}
