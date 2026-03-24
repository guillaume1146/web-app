

import type { PageHeaderProps } from '@/types'

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon: Icon }) => {
 return (
 <div className="bg-gradient-main text-white py-16">
 <div className="container mx-auto px-4 text-center">
 <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
 {Icon && <Icon className="text-4xl" />}
 {title}
 </h1>
 <p className="text-xl max-w-3xl mx-auto">{description}</p>
 </div>
 </div>
 )
}

export default PageHeader