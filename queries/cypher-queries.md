# Cypher-Abfragen – Neo4J Reiseempfehlungen

Alle Abfragen laufen über die REST-API (`server.js`) gegen die Neo4J AuraDB.
Das Frontend zeigt nur die Ergebnisse – die Queries sind hier dokumentiert.

---

## 1. Dashboard – Überblickskennzahlen

```cypher
MATCH (u:User) WITH count(u) AS users
MATCH (p:Property) WITH users, count(p) AS properties
MATCH (b:Booking) WITH users, properties, count(b) AS bookings,
                       round(avg(b.price) * 100) / 100 AS avg_preis
RETURN users, properties, bookings, avg_preis
```

---

## 2. Nutzer (CRUD)

### Alle Nutzer lesen
```cypher
MATCH (u:User)
OPTIONAL MATCH (u)-[:PREFERS]->(c:Category)
RETURN u.id AS id, u.name AS name, u.email AS email,
       c.name AS präferenz
ORDER BY toInteger(substring(u.id, 1)) ASC
```

### Nutzer erstellen (ID wird serverseitig aus DB-Maximum berechnet)
```cypher
OPTIONAL MATCH (existing:User)
WITH coalesce(max(toInteger(substring(existing.id, 1))), 0) + 1 AS nextNum
CREATE (u:User {
  id: CASE WHEN nextNum < 10 THEN 'U0' + toString(nextNum) ELSE 'U' + toString(nextNum) END,
  name: $name, email: $email
})
WITH u
OPTIONAL MATCH (c:Category {name: $praeferenz})
FOREACH (cat IN CASE WHEN c IS NOT NULL THEN [c] ELSE [] END |
  CREATE (u)-[:PREFERS]->(cat)
)
RETURN u.id AS id, u.name AS name
```

### Nutzer ändern (inkl. PREFERS-Verknüpfung)
```cypher
MATCH (u:User {id: $id})
SET u.name = $name, u.email = $email
WITH u
OPTIONAL MATCH (u)-[r:PREFERS]->()
DELETE r
WITH u
OPTIONAL MATCH (c:Category {name: $praeferenz})
FOREACH (cat IN CASE WHEN c IS NOT NULL THEN [c] ELSE [] END |
  CREATE (u)-[:PREFERS]->(cat)
)
RETURN u.id AS id, u.name AS name
```

### Nutzer löschen (inkl. Buchungen per DETACH)
```cypher
MATCH (u:User {id: $id})
OPTIONAL MATCH (u)-[:MADE]->(b:Booking)
DETACH DELETE u, b
```

---

## 3. Unterkünfte (CRUD + Suche mit Filtern)

### Unterkünfte lesen (mit optionalen Filtern)
```cypher
-- Ohne Filter (alle Unterkünfte):
MATCH (p:Property)-[:LOCATED_IN]->(city:City)
OPTIONAL MATCH (city)-[:IN_COUNTRY]->(country:Country)
WITH p, city, collect(country)[0] AS country
OPTIONAL MATCH (p)-[:OF_CATEGORY]->(cat:Category)
RETURN p.id AS id, p.name AS name, p.type AS type,
       p.pricePerNight AS preis, p.rating AS rating,
       city.name AS stadt, country.name AS land, cat.name AS kategorie
ORDER BY toInteger(substring(p.id, 1)) ASC

-- Mit Stadtfilter und/oder Mindestrating:
MATCH (p:Property)-[:LOCATED_IN]->(city:City)
WHERE city.name = $city AND p.rating >= $minRating
OPTIONAL MATCH (city)-[:IN_COUNTRY]->(country:Country)
WITH p, city, collect(country)[0] AS country
MATCH (p)-[:OF_CATEGORY]->(cat:Category)
WHERE cat.name = $category
RETURN p.id AS id, p.name AS name, p.type AS type,
       p.pricePerNight AS preis, p.rating AS rating,
       city.name AS stadt, country.name AS land, cat.name AS kategorie
ORDER BY toInteger(substring(p.id, 1)) ASC
```

> `collect(country)[0]` stellt sicher, dass eine Unterkunft auch dann nur einmal erscheint,
> wenn eine Stadt mehrere Country-Verknüpfungen hat.

### Unterkunft erstellen (mit City-, Country- und Category-Verknüpfung)
```cypher
OPTIONAL MATCH (existing:Property)
WITH coalesce(max(toInteger(substring(existing.id, 1))), 0) + 1 AS nextNum
MERGE (city:City {name: $cityName})
FOREACH (ignored IN CASE WHEN $countryName <> '' THEN [1] ELSE [] END |
  MERGE (country:Country {name: $countryName})
  MERGE (city)-[:IN_COUNTRY]->(country)
)
CREATE (p:Property {
  id: CASE WHEN nextNum < 10 THEN 'P0' + toString(nextNum) ELSE 'P' + toString(nextNum) END,
  name: $name, type: $type,
  pricePerNight: toFloat($pricePerNight),
  rating: toInteger($rating)
})-[:LOCATED_IN]->(city)
WITH p
OPTIONAL MATCH (cat:Category {name: $categoryName})
FOREACH (c IN CASE WHEN cat IS NOT NULL THEN [cat] ELSE [] END |
  CREATE (p)-[:OF_CATEGORY]->(c)
)
RETURN p.id AS id, p.name AS name
```

### Unterkunft ändern (inkl. Stadt- und Land-Verknüpfung)
```cypher
MATCH (p:Property {id: $id})
SET p.name = $name, p.type = $type,
    p.pricePerNight = toFloat($pricePerNight),
    p.rating = toInteger($rating)
WITH p
OPTIONAL MATCH (p)-[r:LOCATED_IN]->()
DELETE r
WITH p
MERGE (city:City {name: $cityName})
WITH p, city
OPTIONAL MATCH (city)-[oldRel:IN_COUNTRY]->()
DELETE oldRel
WITH p, city
FOREACH (ignored IN CASE WHEN $countryName <> '' THEN [1] ELSE [] END |
  MERGE (country:Country {name: $countryName})
  MERGE (city)-[:IN_COUNTRY]->(country)
)
CREATE (p)-[:LOCATED_IN]->(city)
RETURN p.id AS id, p.name AS name
```

### Unterkunft löschen
```cypher
MATCH (p:Property {id: $id})
DETACH DELETE p
```

---

## 4. Buchungen – Verknüpfungen erfassen und löschen

### Alle Buchungen lesen
```cypher
MATCH (u:User)-[:MADE]->(b:Booking)-[:FOR]->(p:Property)
RETURN b.id AS id, u.name AS user, p.name AS property,
       b.checkIn AS checkIn, b.checkOut AS checkOut,
       b.price AS preis
ORDER BY toInteger(substring(b.id, 1)) ASC
```

### Buchung anlegen – Verknüpfungskette (User)-[:MADE]->(Booking)-[:FOR]->(Property)
```cypher
OPTIONAL MATCH (existing:Booking)
WITH coalesce(max(toInteger(substring(existing.id, 1))), 0) + 1 AS nextNum
MATCH (u:User {id: $userId})
MATCH (p:Property {id: $propertyId})
CREATE (u)-[:MADE]->(b:Booking {
  id: CASE WHEN nextNum < 10 THEN 'B0' + toString(nextNum) ELSE 'B' + toString(nextNum) END,
  checkIn: date($checkIn),
  checkOut: date($checkOut),
  price: toFloat($price)
})-[:FOR]->(p)
RETURN b.id AS id, u.name AS user, p.name AS property
```

### Buchung löschen
```cypher
MATCH (b:Booking {id: $id})
DETACH DELETE b
```

---

## 5. Pfadabfragen

### 2-Hop: Nutzer → Buchung → Unterkunft
```cypher
MATCH (u:User {id: $userId})-[:MADE]->(b:Booking)-[:FOR]->(p:Property)
RETURN u.name AS user, b.id AS buchung,
       p.name AS property, b.price AS preis, b.checkIn AS datum
ORDER BY b.checkIn DESC
```

### 4er-Kette: Nutzer → Buchung → Unterkunft → Stadt → Land
```cypher
MATCH (u:User {id: $userId})-[:MADE]->(b:Booking)-[:FOR]->(p:Property)
      -[:LOCATED_IN]->(city:City)-[:IN_COUNTRY]->(country:Country)
RETURN u.name AS user, b.checkIn AS datum,
       p.name AS property, city.name AS stadt, country.name AS land
ORDER BY b.checkIn
```

---

## 6. Aggregation mit Filter

### Ø Buchungspreis pro Stadt – nur Unterkünfte mit Rating ≥ 4
```cypher
MATCH (b:Booking)-[:FOR]->(p:Property)-[:LOCATED_IN]->(city:City)
WHERE p.rating >= 4
RETURN city.name AS stadt,
       count(b) AS anzahl_buchungen,
       round(avg(b.price) * 100) / 100 AS durchschnittspreis,
       round(avg(p.rating) * 10) / 10 AS avg_rating
ORDER BY anzahl_buchungen DESC
```

### Buchungen und Umsatz pro Kategorie
```cypher
MATCH (b:Booking)-[:FOR]->(p:Property)-[:OF_CATEGORY]->(cat:Category)
WHERE b.price > 0
RETURN cat.name AS kategorie,
       count(b) AS anzahl_buchungen,
       sum(b.price) AS gesamtumsatz
ORDER BY anzahl_buchungen DESC
```

---

## 7. Reiseempfehlung – Collaborative Filtering mit Präferenz-Boost

```cypher
MATCH (ich:User {id: $userId})-[:MADE]->(:Booking)-[:FOR]->(gemeinsam:Property)
      <-[:FOR]-(:Booking)<-[:MADE]-(andere:User)
WHERE andere <> ich
MATCH (andere)-[:MADE]->(:Booking)-[:FOR]->(empfehlung:Property)
      -[:OF_CATEGORY]->(cat:Category)
WHERE NOT (ich)-[:MADE]->(:Booking)-[:FOR]->(empfehlung)
WITH ich, empfehlung, cat,
     count(DISTINCT andere) AS aehnliche_nutzer,
     collect(DISTINCT andere.name) AS basierend_auf
OPTIONAL MATCH (ich)-[pref:PREFERS]->(cat)
WITH empfehlung, cat, aehnliche_nutzer, basierend_auf,
     CASE WHEN pref IS NOT NULL THEN 3 ELSE 1 END AS kategorie_boost
RETURN empfehlung.name AS property,
       empfehlung.type AS typ,
       cat.name AS kategorie,
       empfehlung.rating AS rating,
       aehnliche_nutzer * kategorie_boost AS score,
       basierend_auf
ORDER BY score DESC, empfehlung.rating DESC
LIMIT 5
```

---

## Hilfsdaten

### Alle Kategorien
```cypher
MATCH (c:Category) RETURN c.name AS name ORDER BY c.name
```

### Alle Städte
```cypher
MATCH (c:City) RETURN c.name AS name ORDER BY c.name
```
