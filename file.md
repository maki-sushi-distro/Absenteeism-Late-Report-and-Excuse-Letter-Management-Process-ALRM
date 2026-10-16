# Architecture ng REST API

Ang dokumentong ito ay nagpapaliwanag kung paano gumagana ang Laravel REST API ng sistema. Ang mga diagram ay naka-Mermaid, kaya makikita ang mga ito nang diretso sa GitHub o sa VS Code na may Mermaid preview.

---

## 1. Ano ang API, REST, at REST API?

```mermaid
flowchart LR
    API["API<br/>Tulay ng frontend at backend"]
    REST["REST<br/>Patakaran sa pagdidisenyo ng API"]
    RAPI["REST API<br/>API na sumusunod sa REST<br/>(ang Laravel backend natin)"]

    API --> RAPI
    REST --> RAPI
```

- **API** ay ang tulay ng frontend at backend. Ang frontend ay nagpapadala ng request at ang backend ay nagbabalik ng response.
- **REST** ay istilo o patakaran sa pagdidisenyo ng API: resource-based ang URL, HTTP method ang nagsasabi ng aksyon, stateless, at JSON ang format ng data.
- **REST API** ay ang API na sumusunod sa mga patakaran ng REST.

---

## 2. Ang apat na HTTP methods

```mermaid
flowchart LR
    Client["Client"]

    Client --> GET["GET<br/>Kumuha ng data<br/>Status: 200"]
    Client --> POST["POST<br/>Gumawa ng bago<br/>Status: 201"]
    Client --> PATCH["PUT / PATCH<br/>Mag-update<br/>Status: 200"]
    Client --> DEL["DELETE<br/>Magbura<br/>Status: 204"]

    GET --> DB[("Database")]
    POST --> DB
    PATCH --> DB
    DEL --> DB
```

| Method | Aksyon | CRUD | Halimbawa sa routes | Status |
|---|---|---|---|---|
| GET | Magbasa | Read | `GET /requests/5` | 200 |
| POST | Gumawa | Create | `POST /requests` | 201 |
| PUT / PATCH | Mag-update | Update | `PATCH /requests/5` | 200 |
| DELETE | Magbura | Delete | `DELETE /requests/5` | 204 |

Pareho ang URL (`/requests/5`) sa GET, PATCH, at DELETE. Ang method ang nagpapasya sa aksyon.

- **PUT** ay pinapalitan ang buong record, kaya kailangang ipadala ang lahat ng field.
- **PATCH** ay binabago lang ang isa o ilang field.

---

## 3. Ano ang nangyayari sa isang request

```mermaid
flowchart TB
    C["Client<br/>Nagpapadala ng request + token"]
    A["1. May token ba?<br/>auth:sanctum<br/>Wala = 401"]
    S["2. Pwede ba ang account?<br/>active, inactive<br/>Hindi = 403"]
    R["3. Tamang role ba?<br/>role:student, administrator, etc.<br/>Mali = 403"]
    V["4. Tama ba ang input?<br/>Validation<br/>Mali = 422"]
    P["5. Pwede ba sa record na ito?<br/>Policy<br/>Hindi = 403"]
    D["6. Controller + Database<br/>Gagawin na ang aksyon"]
    J["JSON response<br/>200, 201, o 204"]

    C --> A --> S --> R --> V --> P --> D --> J
```

Basahin ito mula taas pababa na parang pila sa gate. Kapag bumagsak ang request sa kahit anong hakbang, hihinto agad doon at magbabalik ng JSON error.

- Ang hakbang 1 hanggang 3 ay ang `middleware` sa routes (`auth:sanctum`, `active`, `inactive`, `role:...`).
- Ang hakbang 4 ay ang validation (`FormRequest`).
- Ang hakbang 5 ay ang `ExcuseRequestPolicy`.
- Ang `throttle` ay nasa login, OTP, at evidence upload routes lang.

---

## 4. Paano nahahanap ng policy kung sino ang kaugnay ng request

```mermaid
flowchart TB
    ER["ExcuseRequest<br/>Request na tinitingnan"]
    EN["Enrollment<br/>Student sa isang class"]
    ST["Student<br/>student_id"]
    CL["Class<br/>May instructor at program"]
    IN["Instructor<br/>instructor_id"]
    PR["Program<br/>program_id"]
    PH["Program head<br/>headedProgram"]

    ER --> EN
    EN --> ST
    EN --> CL
    CL --> IN
    CL --> PR
    PR --> PH

    classDef data fill:#F1EFE8,stroke:#5F5E5A,color:#2C2C2A
    classDef person fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    class ER,EN,CL,PR data
    class ST,IN,PH person
```

Gray ang mga data at teal ang mga taong tinitingnan ng policy. Ang daan mula sa request pababa ang ginagamit ng code, halimbawa `$excuseRequest->enrollment->class->instructor_id`. Walang check para sa administrator dahil palagi siyang pwedeng tumingin.

---

## 5. Sino ang pwede sa bawat aksyon (`ExcuseRequestPolicy`)

```mermaid
flowchart TB
    subgraph V["view (tumingin)"]
        direction LR
        V1["Administrator<br/>Lahat"]
        V2["Student<br/>Kung kanya"]
        V3["Instructor<br/>Kung class niya"]
        V4["Program head<br/>Kung program niya"]
    end

    subgraph D["decide (approve, reject)"]
        direction LR
        D1["Instructor lang<br/>Kung class niya"]
    end

    subgraph U["update at delete (baguhin, burahin)"]
        direction LR
        U1["Student lang<br/>Kung kanya at pending pa"]
    end

    classDef ok fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    class V1,V2,V3,V4,D1,U1 ok
```

Ang mga nakalista lang ang pwede. Ang hindi nakalista ay bawal at makakatanggap ng `403`.

| Policy method | Resulta |
|---|---|
| `viewAny`, `create`, `restore`, `forceDelete` | Palaging `false` |
| `view` | Administrator, student na may-ari, instructor ng class, program head ng program |
| `decide` | Instructor ng class lang |
| `update`, `delete` | Student na may-ari lang, at `pending` pa ang status |

---

## RoleMiddleware vs Policy

| | Antas | Tinatanong nito |
|---|---|---|
| `RoleMiddleware` | Sa route, bago ang controller | Tama ba ang klase ng user para sa buong group ng routes? |
| `ExcuseRequestPolicy` | Sa record, sa loob ng controller | Pwede ba ang user sa mismong request na ito? |

Halimbawa, kung sa ibang student ang request #5, makakatanggap ng `403` ang isang student kahit tama ang role niya. Ito ang dahilan kung bakit kailangan ang policy at hindi sapat ang role lang.