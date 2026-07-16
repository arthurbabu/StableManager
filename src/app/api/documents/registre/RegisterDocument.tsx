import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#444444", marginBottom: 4 },
  table: { display: "flex", width: "100%", borderWidth: 1, borderColor: "#999999", marginTop: 16 },
  row: { flexDirection: "row" },
  headerRow: { backgroundColor: "#dbe4f0" },
  cell: {
    flexGrow: 1,
    flexBasis: 0,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#999999",
    padding: 4,
  },
  headerCell: { fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 8, color: "#888888" },
});

const LABELS = {
  fr: {
    title: "REGISTRE D'ÉLEVAGE",
    subtitle: "Présence et caractéristiques des animaux",
    period: (from: string, to: string) => `Liste des présences entre le ${from} et le ${to}`,
    columns: [
      "Nom",
      "N° SIRE",
      "N° transpondeur",
      "Nom et coordonnées du propriétaire",
      "Date de première entrée",
      "Adresse de provenance",
      "Date de sortie définitive",
      "Adresse de destination",
    ],
    generatedOn: (date: string) => `Généré le ${date}`,
    noRows: "Aucun mouvement enregistré sur cette période.",
  },
  en: {
    title: "BREEDING REGISTER",
    subtitle: "Animal presence & characteristics",
    period: (from: string, to: string) => `Presence list from ${from} to ${to}`,
    columns: [
      "Name",
      "SIRE No.",
      "Transponder No.",
      "Owner name & contact",
      "First entry date",
      "Origin address",
      "Final exit date",
      "Destination address",
    ],
    generatedOn: (date: string) => `Generated on ${date}`,
    noRows: "No movements recorded for this period.",
  },
};

export type RegisterRow = {
  horseName: string;
  sireNumber: string;
  transponderNumber: string;
  owner: string;
  entryDate: string;
  provenance: string;
  exitDate: string;
  destination: string;
};

export function RegisterDocument({
  rows,
  from,
  to,
  generatedOn,
  locale,
}: {
  rows: RegisterRow[];
  from: string;
  to: string;
  generatedOn: string;
  locale: "fr" | "en";
}) {
  const l = LABELS[locale];
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{l.title}</Text>
        <Text style={styles.subtitle}>{l.subtitle}</Text>
        <Text style={styles.subtitle}>{l.period(from, to)}</Text>

        <View style={styles.table}>
          <View style={{ ...styles.row, ...styles.headerRow }}>
            {l.columns.map((col) => (
              <Text key={col} style={{ ...styles.cell, ...styles.headerCell }}>
                {col}
              </Text>
            ))}
          </View>
          {rows.length === 0 ? (
            <View style={styles.row}>
              <Text style={{ ...styles.cell, flexGrow: 8 }}>{l.noRows}</Text>
            </View>
          ) : (
            rows.map((row, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.cell}>{row.horseName}</Text>
                <Text style={styles.cell}>{row.sireNumber}</Text>
                <Text style={styles.cell}>{row.transponderNumber}</Text>
                <Text style={styles.cell}>{row.owner}</Text>
                <Text style={styles.cell}>{row.entryDate}</Text>
                <Text style={styles.cell}>{row.provenance}</Text>
                <Text style={styles.cell}>{row.exitDate}</Text>
                <Text style={styles.cell}>{row.destination}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>{l.generatedOn(generatedOn)}</Text>
      </Page>
    </Document>
  );
}
