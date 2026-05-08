# react-colorful

Context7 ID: `/omgovich/react-colorful`

## Использование
```jsx
import { HexColorPicker, HexColorInput } from 'react-colorful';

const [color, setColor] = useState('#aabbcc');
<HexColorPicker color={color} onChange={setColor} />
<HexColorInput color={color} onChange={setColor} prefixed />
```

## Компоненты
- HexColorPicker, RgbColorPicker, HslColorPicker, HsvaColorPicker (alpha)

## Характеристики
- 2.8 kB min+gz, zero deps
- Touch support
- Tree-shakeable

## Ограничения
- Нет swatches/палитр из коробки
- Нет встроенной истории цветов
