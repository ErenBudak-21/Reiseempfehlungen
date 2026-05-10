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
RETURN u.id AS id, u.name AS name, u.email AS email, u.age AS age,
       c.name AS praeferenz
ORDER BY toInteger(substring(u.id, 1)) ASC
```

### Nutzer erstellen
```cypher
CREATE (u:User {id: $id, name: $name, email: $email, age: toInteger($age)})
WITH u
OPTIONAL MATCH (c:Category {name: $praeferenz})
FOREACH (cat IN CASE WHEN c IS NOT NULL THEN [c] ELSE [] END |
  CREATE (u)-[:PREFERS]->(cat)
)
RETURN u.id AS id, u.name AS name
```

### Nutzer ändern
```cypher
MATCH (u:User {id: $id})
SET u.name = $name, u.email = $email, u.age = toInteger($age)
RETURN u.id AS id, u.name AS name
```

### Nutzer löschen (inkl. Buchungen)
```cypher
MATCH (u:User {id: $id})
OPTIONAL MATCH (u)-[:MADE]->(b:Booking)
DETACH DELETE u, b
```

---

## 3. Unterkünfte (CRUD + Suche mit Filtern)

### Unterkünfte lesen (mit optionalen Filtern)
```cypher
MATCH (p:Property)-[:LOCATED_IN]->(city:City)-[:IN_COUNTRY]->(country:Country)
OPTIONAL MATCH (p)-[:OF_CATEGORY]->(cat:Category)
WHERE 1=1
  [AND cat.name = $category]
  [AND city.name = $city]
  [AND p.rating >= $minRating]
RETURN p.id AS id, p.name AS name, p.type AS type,
       p.pricePerNight AS preis, p.rating AS rating,
       city.name AS stadt, country.name AS land, cat.name AS kategorie
ORDER BY toInteger(substring(p.id, 1)) ASC
```

### Unterkunft erstellen (mit Verknüpfungen zu City und Category)
```cypher
MATCH (city:City {name: $cityName})
CREATE (p:Property {
  id: $id, name: $name, type: $type,
  pricePerNight: toFloat($pricePerNight),
  rating: toFloat($rating)
})-[:LOCATED_IN]->(city)
WITH p
OPTIONAL MATCH (cat:Category {name: $categoryName})
FOREACH (c IN CASE WHEN cat IS NOT NULL THEN [c] ELSE [] END |
  CREATE (p)-[:OF_CATEGORY]->(c)
)
RETURN p.id AS id, p.name AS name
```

### Unterkunft ändern
```cypher
MATCH (p:Property {id: $id})
SET p.name = $name, p.type = $type,
    p.pricePerNight = toFloat($pricePerNight),
    p.rating = toFloat($rating)
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
       b.price AS preis, b.numGuests AS gaeste
ORDER BY toInteger(substring(b.id, 1)) ASC
```

### Buchung anlegen – Verknüpfungskette (User)-[:MADE]->(Booking)-[:FOR]->(Property)
```cypher
MATCH (u:User {id: $userId})
MATCH (p:Property {id: $propertyId})
CREATE (u)-[:MADE]->(b:Booking {
  id: $id,
  checkIn: date($checkIn),
  checkOut: date($checkOut),
  price: toFloat($price),
  numGuests: toInteger($numGuests)
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

### Ø Preis pro Stadt – nur Unterkünfte mit Rating ≥ 4
```cypher
MATCH (b:Booking)-[:FOR]->(p:Property)-[:LOCATED_IN]->(city:City)
WHERE p.rating >= 4.0
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

## 7. Reiseempfehlung – Collaborative Filtering

```cypher
MATCH (ich:User {id: $userId})-[:MADE]->(:Booking)-[:FOR]->(gemeinsam:Property)
      <-[:FOR]-(:Booking)<-[:MADE]-(andere:User)
WHERE andere <> ich
MATCH (andere)-[:MADE]->(:Booking)-[:FOR]->(empfehlung:Property)
      -[:OF_CATEGORY]->(cat:Category)
WHERE NOT (ich)-[:MADE]->(:Booking)-[:FOR]->(empfehlung)
OPTIONAL MATCH (ich)-[pref:PREFERS]->(cat)
WITH empfehlung, cat,
     count(DISTINCT andere) AS aehnliche_nutzer,
     CASE WHEN pref IS NOT NULL THEN 2 ELSE 1 END AS kategorie_boost
RETURN empfehlung.name AS property,
       empfehlung.type AS typ,
       cat.name AS kategorie,
       empfehlung.rating AS rating,
       aehnliche_nutzer * kategorie_boost AS score
ORDER BY score DESC
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
