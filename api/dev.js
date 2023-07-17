const Route = require("./route.js");

const toCamelCase = (name) => {
    return name.toLowerCase().replace(/[-_][a-z]/g, (group) => group.slice(-1).toUpperCase());
}

const toCamelCaseMethod = (name) => {
    return name.charAt(0).toUpperCase() + toCamelCase(name.substring(1));
}

class Dev extends Route {
    constructor(app) {
        super(app, "/dev");

        this.addEntry("generateBean", async(req, res) => {
            let tableName = req.body.table;
            let className = toCamelCaseMethod(tableName);
            let cols = await this.select({
                select: ["column_name", "data_type", "ordinal_position"],
                from: ["columns"],
                where: {
                    keys: ["table_name"],
                    values: [tableName]
                }
            }, "information_schema");
            let bean = "package org.luke.diminou.data.beans;\n\n" +
                "import org.json.JSONObject;\n" +
                "import org.luke.diminou.abs.utils.functional.ObjectConsumer;\n" +
                "import org.luke.diminou.data.property.Property;\n\n" +
                "public class " + className + " extends Bean {\n\n\t"+
                "public static void getForId(int id, ObjectConsumer<" + className + "> on" + className + ") {\n\t\t" +
                "Bean.getForId(" + className + ".class, id, on" + className + ");\n\t" +
                "}\n\n\t"+
                "public static "+className+" getForIdSync(int id) {\n\t\t" +
                "return Bean.getForIdSync(" + className + ".class, id);\n\t" +
                "}\n\t";

            cols.forEach(col => {
                if (col.data_type === "text") {
                    bean += "\n\tprivate final Property<String> " + toCamelCase(col.column_name) + ";";
                } else if (col.data_type === "integer") {
                    bean += "\n\tprivate final Property<Integer> " + toCamelCase(col.column_name) + ";";
                } else if (col.data_type === "boolean") {
                    bean += "\n\tprivate final Property<Boolean> " + toCamelCase(col.column_name) + ";";
                }
            });

            bean += "\n\n\tprivate " + className + "(JSONObject obj) {"

            cols.forEach(col => {
                bean += "\n\t\t" + toCamelCase(col.column_name) + " = new Property<>();";
            });

            bean += "\n\t\tinit(obj);\n\t}\n"

            cols.forEach(col => {
                if (col.data_type === "text") {
                    bean += "\n\tpublic Property<String> " + toCamelCase(col.column_name) + "Property() {\n\t\treturn " + toCamelCase(col.column_name) + ";\n\t}\n";
                    bean += "\n\tpublic String get" + toCamelCaseMethod(col.column_name) + "() {\n\t\treturn " + toCamelCase(col.column_name) + ".get();\n\t}\n";
                    bean += "\n\tpublic void set" + toCamelCaseMethod(col.column_name) + "(String val) {\n\t\t" + toCamelCase(col.column_name) + ".set(val);\n\t}\n";
                } else if (col.data_type === "integer") {
                    bean += "\n\tpublic Property<Integer> " + toCamelCase(col.column_name) + "Property() {\n\t\treturn " + toCamelCase(col.column_name) + ";\n\t}\n";
                    bean += "\n\tpublic Integer get" + toCamelCaseMethod(col.column_name) + "() {\n\t\treturn " + toCamelCase(col.column_name) + ".get();\n\t}\n";
                    bean += "\n\tpublic void set" + toCamelCaseMethod(col.column_name) + "(Integer val) {\n\t\t" + toCamelCase(col.column_name) + ".set(val);\n\t}\n";
                } else if (col.data_type === "boolean") {
                    bean += "\n\tpublic Property<Boolean> " + toCamelCase(col.column_name) + "Property() {\n\t\treturn " + toCamelCase(col.column_name) + ";\n\t}\n";
                    bean += "\n\tpublic Boolean is" + toCamelCaseMethod(col.column_name) + "() {\n\t\treturn " + toCamelCase(col.column_name) + ".get();\n\t}\n";
                    bean += "\n\tpublic void set" + toCamelCaseMethod(col.column_name) + "(Boolean val) {\n\t\t" + toCamelCase(col.column_name) + ".set(val);\n\t}\n";
                }
            });

            bean += "\n\t@Override\n\tpublic String toString() {\n\t\treturn getClass().getSimpleName() + \" {\"";

            cols.forEach(col => {
                bean += "\n\t\t\t+ \"\\t" + toCamelCase(col.column_name) + " : \" + " + toCamelCase(col.column_name) + ".get()";
            });

            bean += "\n\t\t+ \"}\";"

            bean += "\n\t}";

            bean += "\n}"


            res.send(bean);
        })
    }
}

module.exports = Dev;