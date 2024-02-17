namespace BitesInByte.Tools.Models
{
    public class ToolsInfo
    {
        public string Descripion { get; set; }
        public string Title { get; set; }
        public string Href { get; set; }
        public int Priority { get; set; }

        public static List<ToolsInfo> GetTools()
        {
            var list = new List<ToolsInfo>
            {

                new ToolsInfo
                {
                    Title = "Text Compare",
                    Descripion = "Introducing our new text compare tool! This powerful tool allows you to easily compare two or more text documents and identify differences between them.",
                    Href = "/textCompare",
                    Priority = 5
                },
                new ToolsInfo
                {
                    Title = "JSON Formattor",
                    Descripion = "Introducing our new JSON formatter tool! This powerful tool allows you to quickly format and validate your JSON data. With a simple and intuitive interface, you can easily input your JSON data and choose the formatting options that work best for you.",
                    Href = "/jsonFormatter",
                    Priority = 7
                },
                new ToolsInfo
                {
                    Title = "Encode/Decode",
                    Descripion = "Introducing our new Encode/Decode tool! This powerful tool allows you to quickly encode and decode your data using a variety of encoding formats. With a simple and intuitive interface, you can easily input your data and choose the encoding format that works best for you.",
                    Href = "/encode-decode",
                    Priority = 8
                },
                new ToolsInfo
                {
                    Title = "Rss To Json",
                    Descripion = "Effortlessly convert your RSS feed to structured JSON data with our online tool and APIs. Streamline your data conversion process and try our tool today.",
                    Href = "/rssToJson",
                    Priority = 9
                },
                new ToolsInfo
                {
                    Title = "Change Csv Delimiter",
                    Descripion = "Upload and change your CSV delimiter online with our easy-to-use tool. Simplify your data management process and try our online CSV delimiter changer today.",
                    Href = "/change-csv-delimiter",
                    Priority = 6
                },
                 new ToolsInfo
                {
                    Title = "JWT (Json Web Token)",
                    Descripion = "Our online JWT decoder is the best alternative to jwt.io for decoding your JSON web token. Simply past and decode your token for easy data access. Try our JWT decoder today!",
                    Href = "/jwt",
                    Priority = 9
                },
                 new ToolsInfo
                 {
                     Title = "NCrontab Expression Tester",
                     Href = "/NCrontab",
                     Priority = 10,
                     Descripion = "Use our NCrontab expression tester tool to easily test and view the DateTimes of your occurrences. Simplify your workflow and try it today!"
                 },
                 new ToolsInfo
                 {
                     Title = "YAML Schema Validator",
                     Href = "/yaml-schema-validator",
                     Priority = 10,
                     Descripion = "Our online YAML schema validator is the best tool for validating up to thousands of schemas from https://www.schemastore.org. Simplify your data validation process and try it today!"
                 },
                  new ToolsInfo
                 {
                     Title = "Json to YAML",
                     Href = "/jsonToYaml",
                     Priority = 10,
                     Descripion = "Our online JSON to YAML converter tool is the best solution for converting your JSON data to YAML format. Simplify your data conversion process and try it today!"
                 },
                  new ToolsInfo
                 {
                     Title = "YAML to Json",
                     Href = "/yamlToJson",
                     Priority = 10,
                     Descripion = "Our online YAML to JSON converter tool is the best solution for converting your YAML data to JSON format. Simplify your data conversion process and try it today!"
                 }
            };

            return list.OrderByDescending(x => x.Priority).ToList();
        }
    }
}
