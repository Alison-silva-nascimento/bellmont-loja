import { products } from './products'
import { devCartProduct } from '../dev/cartFixture'

export const commerceCatalog = import.meta.env.DEV ? [...products, devCartProduct] : products
