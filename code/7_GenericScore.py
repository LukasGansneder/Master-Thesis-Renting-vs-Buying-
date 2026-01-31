import numpy as np
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

tilgung=0.02
diskontsatz=0.04
rendite_invest=0.08
betrachtungszeitraum=10
wohnflaeche_m2=58
mietsteigerung=0.02
kaufnebenkosten_quote=0.1
eigenkapitalquote=0.14
preissteigerung_immobilie=0.02
instandhaltung_quote=0.005
verkaufskosten_quote=0
steuersatz_veraeusserungsgewinn=0.25

def annuitaet_zahlung(kreditsumme: float, zins: float, tilgung: float) -> float:

    if kreditsumme <= 0:
        return 0.0
    if zins < 0 or tilgung < 0:
        raise ValueError("Zins und Tilgung müssen > 0 sein")

    return kreditsumme * (zins + tilgung)

def npv_kaufen(kaufpreis_pro_m2: float, zins: float, erwartete_rendite: float, tilgung: float, betrachtungszeitraum: int = 10, 
               wohnflaeche_m2: float = 80.0, eigenkapitalquote: float = 0.20, kaufnebenkosten_quote: float = 0.10, 
               verkaufskosten_quote: float = 0.05, instandhaltung_quote: float = 0.01, preissteigerung_immobilie: float = 0.02,
               steuersatz_veraeusserungsgewinn: float = 0.25) -> float:
    
    H = int(betrachtungszeitraum)
    if H <= 0:
        return np.nan

    # Initialwerte
    kaufpreis = float(kaufpreis_pro_m2) * float(wohnflaeche_m2)
    kaufnebenkosten = kaufpreis * kaufnebenkosten_quote
    anschaffungskosten = kaufpreis + kaufnebenkosten
    eigenkapital = eigenkapitalquote * anschaffungskosten
    darlehen = anschaffungskosten - eigenkapital
    annuitaet = annuitaet_zahlung(darlehen, zins, tilgung)
    restschuld = darlehen

    # CF Betrachtung    
    cashflows = np.zeros(H + 1)
    # CF0
    cashflows[0] = -eigenkapital
    # CF1 bis CFH+1
    for t in range(1, H + 1):
        immowert_t = kaufpreis * (1.0 + preissteigerung_immobilie) ** t
        zinsen_t = restschuld * zins
        tilgung_t = max(0.0, annuitaet - zinsen_t)
        tilgung_t = min(tilgung_t, restschuld)
        restschuld = max(0.0, restschuld - tilgung_t)
        instandhaltung_t = instandhaltung_quote * immowert_t
        cashflows[t] = -(zinsen_t + tilgung_t) - instandhaltung_t

    # CFH: CF bei Verkauf
    immowert_H = kaufpreis * (1.0 + preissteigerung_immobilie) ** H
    verkaufserloes_netto = immowert_H * (1.0 - verkaufskosten_quote)
    veraeusserungsgewinn = verkaufserloes_netto - anschaffungskosten

    steuer = 0.0
    if H < 10:
        steuer = max(0.0, veraeusserungsgewinn) * steuersatz_veraeusserungsgewinn

    cashflows[H] += (verkaufserloes_netto - steuer - restschuld)

    # Discounting Cash Flows
    diskontfaktoren = np.array([(1.0 + erwartete_rendite) ** t for t in range(H + 1)])
    kapitalwert = float(np.sum(cashflows / diskontfaktoren))
    return kapitalwert

def npv_mieten_und_investieren(mietpreis_pro_m2: float, rendite_invest: float, erwartete_rendite: float, betrachtungszeitraum: int = 10, 
                               wohnflaeche_m2: float = 80.0, mietsteigerung: float = 0.02, 
                               # Buy Parameter: 
                               kaufpreis_pro_m2: float = 0.0, zins: float = 0.0, tilgung: float = 0.0, eigenkapitalquote: float = 0.20, 
                               kaufnebenkosten_quote: float = 0.10, instandhaltung_quote: float = 0.01, 
                               preissteigerung_immobilie: float = 0.02,
                               # Steuer (Endbesteuerung auf Gewinn)
                               kapitalertragssteuer_satz: float = 0.26375,) -> float:
    
    H = int(betrachtungszeitraum)
    if H <= 0:
        return np.nan

    # Budget = Annuität + Instandhaltungskosten 
    kaufpreis = float(kaufpreis_pro_m2) * float(wohnflaeche_m2)
    kaufnebenkosten = kaufpreis * kaufnebenkosten_quote
    anschaffungskosten = kaufpreis + kaufnebenkosten
    eigenkapital = eigenkapitalquote * anschaffungskosten
    darlehen = anschaffungskosten - eigenkapital
    annuitaet = annuitaet_zahlung(darlehen, zins, tilgung)

    # Initialmiete
    jahresmiete_0 = float(mietpreis_pro_m2) * float(wohnflaeche_m2) * 12.0

    # Initial-Investieren 
    vermoegen = float(eigenkapital)
    eingezahltes_geld = float(eigenkapital) # Summe der Einzahlungen ins Depot 

    # CF Betrachtung
    cashflows = np.zeros(H + 1, dtype=float)
    # CF0
    cashflows[0] = -float(eigenkapital)
    # CF1 bis CFH+1
    for t in range(1, H + 1):
        # budget_t = Annuität + Instandhaltungskosten
        immowert_t = kaufpreis * (1.0 + preissteigerung_immobilie) ** t
        instandhaltung_t = instandhaltung_quote * immowert_t
        budget_t = annuitaet + instandhaltung_t
        # Mietkosten + (Differenz) Investieren
        miete_t = jahresmiete_0 * (1.0 + mietsteigerung) ** (t - 1)
        sparen_t = budget_t - miete_t
        # Portfolioentwicklung
        vermoegen = vermoegen * (1.0 + rendite_invest) + sparen_t
        if sparen_t > 0:
            eingezahltes_geld += sparen_t

        # Budget als negativen Cashoutflow
        cashflows[t] = -budget_t

    # CFH: CF bei Verkauf
    gewinn = max(0.0, vermoegen - eingezahltes_geld)
    steuer = gewinn * float(kapitalertragssteuer_satz)
    vermoegen_netto = vermoegen - steuer

    cashflows[H] += vermoegen_netto
    # Discounting Cash Flows 
    diskontfaktoren = np.array([(1.0 + float(erwartete_rendite)) ** t for t in range(H + 1)], dtype=float)
    kapitalwert = float(np.sum(cashflows / diskontfaktoren))
    return kapitalwert


def npv_delta(kaufpreis_pro_m2: float, mietpreis_pro_m2: float, zins: float, tilgung: float, diskontsatz: float, rendite_invest: float,
    betrachtungszeitraum: int = 10, wohnflaeche_m2: float = 58.0, mietsteigerung: float = 0.02, kaufnebenkosten_quote: float = 0.10,
    eigenkapitalquote: float = 0.14, preissteigerung_immobilie: float = 0.03, instandhaltung_quote: float = 0.005,
    verkaufskosten_quote: float = 0.00, steuersatz_veraeusserungsgewinn: float = 0.25,) -> float:
   
    npv_buy = npv_kaufen(kaufpreis_pro_m2=kaufpreis_pro_m2, zins=zins, tilgung=tilgung, erwartete_rendite=diskontsatz, 
                         betrachtungszeitraum=betrachtungszeitraum, wohnflaeche_m2=wohnflaeche_m2, 
                         kaufnebenkosten_quote=kaufnebenkosten_quote, eigenkapitalquote=eigenkapitalquote,
                         preissteigerung_immobilie=preissteigerung_immobilie, instandhaltung_quote=instandhaltung_quote, 
                         verkaufskosten_quote=verkaufskosten_quote, steuersatz_veraeusserungsgewinn=steuersatz_veraeusserungsgewinn,)

    npv_rent_inv = npv_mieten_und_investieren(mietpreis_pro_m2=mietpreis_pro_m2, rendite_invest=rendite_invest, 
                                              erwartete_rendite=diskontsatz, betrachtungszeitraum=betrachtungszeitraum, 
                                              wohnflaeche_m2=wohnflaeche_m2, mietsteigerung=mietsteigerung, 
                                              kaufpreis_pro_m2=kaufpreis_pro_m2, zins=zins, tilgung=tilgung, 
                                              eigenkapitalquote=eigenkapitalquote, kaufnebenkosten_quote=kaufnebenkosten_quote, 
                                              instandhaltung_quote=instandhaltung_quote, 
                                              preissteigerung_immobilie=preissteigerung_immobilie,)

    delta = npv_buy - npv_rent_inv
    return delta

def rent_vs_buy_score(delta_npv: float, scale: float) -> float:

    if scale <= 0:
        raise ValueError("scale must be positive")
    return float(np.tanh(delta_npv / scale))

BASE_DIR = Path("..") / "data" / "output"

df_empirica_regio = pd.read_csv(
    BASE_DIR / "empirica_regio_data.csv",
    encoding="utf-8-sig",
)
df_empirica_regio["Jahr"] = df_empirica_regio["Jahr"].astype(int)

df_macroeconomic_y = pd.read_csv(
    BASE_DIR / "macroeconomic_data_yearly.csv", 
    encoding="utf-8-sig",
)
df_macroeconomic_y["Jahr"] = df_macroeconomic_y["Jahr"].astype(int)

# df_empirica_regio = df_empirica_regio[df_empirica_regio["Regionsebene"] == "Gemeinde"]

df_empirica_regio = df_empirica_regio.merge(df_macroeconomic_y, on=["Jahr"], how="left")

df_empirica_regio["Delta_NPV_5%"] = df_empirica_regio.apply(
    lambda row: npv_delta(kaufpreis_pro_m2=row["Kaufpreis/m2 ETW 5%"], mietpreis_pro_m2=row["Mietpreis/m2 5%"], zins=row["Effektiver Jahreszins"], 
                          tilgung=tilgung, diskontsatz=diskontsatz, rendite_invest=rendite_invest, betrachtungszeitraum=betrachtungszeitraum, wohnflaeche_m2=wohnflaeche_m2,
                          mietsteigerung=mietsteigerung, kaufnebenkosten_quote=kaufnebenkosten_quote, eigenkapitalquote=eigenkapitalquote, 
                          preissteigerung_immobilie=preissteigerung_immobilie, instandhaltung_quote=instandhaltung_quote, verkaufskosten_quote=verkaufskosten_quote, 
                          steuersatz_veraeusserungsgewinn=steuersatz_veraeusserungsgewinn),
    axis=1
)
df_empirica_regio["Delta_NPV_50%"] = df_empirica_regio.apply(
    lambda row: npv_delta(kaufpreis_pro_m2=row["Kaufpreis/m2 ETW 50%"], mietpreis_pro_m2=row["Mietpreis/m2 50%"], zins=row["Effektiver Jahreszins"], 
                          tilgung=tilgung, diskontsatz=diskontsatz, rendite_invest=rendite_invest, betrachtungszeitraum=betrachtungszeitraum, wohnflaeche_m2=wohnflaeche_m2,
                          mietsteigerung=mietsteigerung, kaufnebenkosten_quote=kaufnebenkosten_quote, eigenkapitalquote=eigenkapitalquote, 
                          preissteigerung_immobilie=preissteigerung_immobilie, instandhaltung_quote=instandhaltung_quote, verkaufskosten_quote=verkaufskosten_quote, 
                          steuersatz_veraeusserungsgewinn=steuersatz_veraeusserungsgewinn),
    axis=1
)
df_empirica_regio["Delta_NPV_95%"] = df_empirica_regio.apply(
    lambda row: npv_delta(kaufpreis_pro_m2=row["Kaufpreis/m2 ETW 95%"], mietpreis_pro_m2=row["Mietpreis/m2 95%"], zins=row["Effektiver Jahreszins"], 
                          tilgung=tilgung, diskontsatz=diskontsatz, rendite_invest=rendite_invest, betrachtungszeitraum=betrachtungszeitraum, wohnflaeche_m2=wohnflaeche_m2,
                          mietsteigerung=mietsteigerung, kaufnebenkosten_quote=kaufnebenkosten_quote, eigenkapitalquote=eigenkapitalquote, 
                          preissteigerung_immobilie=preissteigerung_immobilie, instandhaltung_quote=instandhaltung_quote, verkaufskosten_quote=verkaufskosten_quote, 
                          steuersatz_veraeusserungsgewinn=steuersatz_veraeusserungsgewinn),
    axis=1
)


df_empirica_regio = df_empirica_regio[["Regionsname", "RegionID", "Jahr", "Kaufpreis/m2 ETW 5%", "Mietpreis/m2 5%", "Kaufpreis/m2 ETW 50%", "Mietpreis/m2 50%", "Kaufpreis/m2 ETW 95%", "Mietpreis/m2 95%", "Wohneigentumsquote", "Effektiver Jahreszins", "Delta_NPV_5%", "Delta_NPV_50%", "Delta_NPV_95%"]]
df_empirica_regio["Delta_NPV_5%_rel"] = df_empirica_regio["Delta_NPV_5%"] / (df_empirica_regio["Kaufpreis/m2 ETW 5%"] * wohnflaeche_m2 * (1.0 + kaufnebenkosten_quote))
df_empirica_regio["Delta_NPV_50%_rel"] = df_empirica_regio["Delta_NPV_50%"] / (df_empirica_regio["Kaufpreis/m2 ETW 50%"] * wohnflaeche_m2 * (1.0 + kaufnebenkosten_quote))
df_empirica_regio["Delta_NPV_95%_rel"] = df_empirica_regio["Delta_NPV_95%"] / (df_empirica_regio["Kaufpreis/m2 ETW 95%"] * wohnflaeche_m2 * (1.0 + kaufnebenkosten_quote))

# choose 5% NPV advantage as 0.5 Score
S = 0.05 / np.arctanh(0.5)
df_empirica_regio["Score (5% Perzentil)"] = np.tanh(df_empirica_regio["Delta_NPV_5%_rel"] / S)
df_empirica_regio["Score (50% Perzentil)"] = np.tanh(df_empirica_regio["Delta_NPV_50%_rel"] / S)
df_empirica_regio["Score (95% Perzentil)"] = np.tanh(df_empirica_regio["Delta_NPV_95%_rel"] / S)

export = df_empirica_regio[
    [
        "Regionsname",
        "RegionID",
        "Jahr",
        "Score (5% Perzentil)",
        "Score (50% Perzentil)",
        "Score (95% Perzentil)"
    ]
]

out_path = Path("..") / "data" / "output" / "export_3_level_Score.csv"
export.to_csv(out_path, sep=";", decimal=",", index=False, encoding="utf-8-sig")