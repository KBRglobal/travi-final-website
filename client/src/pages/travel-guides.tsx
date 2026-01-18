n travel-guides.tsx make these EXACT changes:

1. DELETE the entire Language Selector section (around line 280-300). Remove this entire block:
```
<motion.div ... transition={{ duration: 0.6, delay: 0.6 }} >
  <Select value={selectedLocale} onValueChange={handleLocaleChange}>
      ...entire Select component...
        </Select>
        </motion.div>
        ```

2. In HERO_GUIDES array (around line 60-90), add an "attractions" property to each destination with REAL numbers:
```
const HERO_GUIDES = [
  { name: "Paris", city: "France", attractions: 2847, image: ... },
    { name: "Dubai", city: "UAE", attractions: 856, image: ... },
      { name: "Tokyo", city: "Japan", attractions: 3412, image: ... },
        { name: "New York", city: "USA", attractions: 2156, image: ... },
          { name: "London", city: "UK", attractions: 1923, image: ... },
          ];
          ```

]