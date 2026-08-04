"""seed policy page content

Replaces the placeholder bodies of the three legal pages (shipping_returns,
privacy_policy, terms_conditions) with the store's real bilingual copy and
publishes them. Content arrived as final approved text from the owner; it is
seeded here (like d1a6e0b48f2c seeded the pages themselves) so every
environment gets it on deploy — staff can still edit it later through the
admin CMS.

The explicit "Last Updated: August 2026" line from the privacy document is
intentionally omitted: the storefront page template already renders
"Updated on {date}" from pages.updated_at under the title.

Revision ID: b9f3e6a2d571
Revises: e4b7d19c3a62
Create Date: 2026-08-04 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b9f3e6a2d571"
down_revision: Union[str, None] = "e4b7d19c3a62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SHIPPING_EN = """\
<p>At GR8 Trend, we aim to provide a smooth and reliable shopping experience. Please read the following policy carefully before placing your order.</p>
<h2>Shipping Policy</h2>
<h3>Order Processing</h3>
<p>Orders are processed after successful payment and confirmation. You will receive an order confirmation using the contact details provided during checkout.</p>
<p>Orders placed during weekends, public holidays, or promotional periods may require additional processing time.</p>
<h3>Delivery Within Kuwait</h3>
<p>We deliver to all available areas across Kuwait. The estimated delivery time is usually 2–4 business days after the order has been confirmed.</p>
<p>Delivery times are estimates and may vary depending on the delivery location, product availability, weather conditions, public holidays, or other circumstances beyond our control.</p>
<h3>Delivery Information</h3>
<p>Customers must provide a complete and accurate delivery address, including the area, block, street, building or house number, floor and apartment number, where applicable.</p>
<p>A valid mobile number must also be provided so that the delivery representative can contact the customer. GR8 Trend will not be responsible for delays caused by incorrect or incomplete delivery information.</p>
<p>If the customer cannot be reached or is unavailable at the time of delivery, the order may be rescheduled. Additional delivery charges may apply.</p>
<h3>Shipping Charges</h3>
<p>Shipping charges, if applicable, will be displayed during checkout before the order is confirmed.</p>
<p>Any additional charges resulting from an incorrect address, failed delivery attempt, or requested change of delivery location may be charged separately.</p>
<h3>Order Tracking</h3>
<p>Where available, customers will receive an update once the order has been dispatched. For assistance with an order, please contact our customer service team and provide your order number.</p>
<h3>Delivery Inspection</h3>
<p>Please inspect the package at the time of delivery. If the package appears damaged, opened, or incomplete, please inform the delivery representative and contact our customer service team immediately.</p>
<h2>Returns and Exchanges</h2>
<p>We want you to be satisfied with your purchase. If you wish to return or exchange an eligible item, please contact us within 14 days of receiving your order.</p>
<p>Requests submitted after the return period may not be accepted.</p>
<h3>Return and Exchange Conditions</h3>
<p>To qualify for a return or exchange, the product must be:</p>
<ul>
<li>Unused, unworn, and unwashed</li>
<li>In its original condition and packaging</li>
<li>Free from stains, perfume, smoke, makeup, or damage</li>
<li>Returned with all original tags and labels attached</li>
<li>Accompanied by the invoice or order confirmation</li>
<li>Returned as a complete set if purchased as part of a set</li>
</ul>
<p>GR8 Trend reserves the right to reject any item that does not meet these conditions.</p>
<h3>Non-Returnable Items</h3>
<p>For hygiene, safety, and quality reasons, the following items cannot be returned or exchanged unless they are defective or were delivered incorrectly:</p>
<ul>
<li>Underwear and personal-use items</li>
<li>Altered, tailored, or customized products</li>
<li>Items that have been worn, washed, damaged, or used</li>
<li>Products without their original packaging or tags</li>
<li>Final-sale or clearance items marked as non-returnable</li>
<li>Gift cards or promotional gifts</li>
</ul>
<h3>Exchange Process</h3>
<p>To request an exchange, please contact our customer service team with your order number, the item you wish to exchange, and the reason for the request.</p>
<p>Exchanges are subject to product, colour, and size availability. If the requested replacement is unavailable, the customer may select another eligible product or request a refund according to this policy.</p>
<p>Delivery charges related to an exchange may apply unless the product received was defective, damaged, or incorrect.</p>
<h3>Damaged, Defective, or Incorrect Items</h3>
<p>If you receive a damaged, defective, or incorrect item, please contact us as soon as possible after delivery.</p>
<p>Please provide:</p>
<ul>
<li>Your order number</li>
<li>A clear description of the issue</li>
<li>Clear photographs or videos showing the product and packaging</li>
</ul>
<p>Once the issue has been verified, GR8 Trend will arrange an appropriate replacement or refund without additional delivery charges.</p>
<h2>Refund Policy</h2>
<p>Returned products will be inspected after they are received. If the return is approved, the refund will be processed through the original payment method used for the purchase.</p>
<p>The time required for the refunded amount to appear may vary depending on the bank or payment provider. Any original shipping or delivery fees are non-refundable unless the item was defective, damaged, or delivered incorrectly.</p>
<p>If a returned product does not meet our return conditions, the refund may be rejected and the product may be sent back to the customer at the customer’s expense.</p>
<h2>Order Cancellation</h2>
<p>Customers may request to cancel an order before it has been processed or dispatched. Once an order has been dispatched, it cannot be cancelled and will be handled according to the return policy.</p>
<p>GR8 Trend reserves the right to cancel an order due to product unavailability, payment issues, incorrect pricing, or other operational reasons. If payment has already been completed, the amount will be refunded.</p>
<h2>Policy Updates</h2>
<p>GR8 Trend reserves the right to update this Shipping and Returns Policy at any time. Any changes will become effective once published on the website.</p>
<h2>Contact Us</h2>
<p>For shipping, exchange, or return enquiries, please contact our customer service team and include your order number to help us assist you quickly.</p>
"""

SHIPPING_AR = """\
<p>في GR8 Trend، نحرص على توفير تجربة تسوق سهلة وموثوقة لعملائنا. يرجى قراءة سياسة الشحن والاستبدال والاسترجاع بعناية قبل إتمام طلبك.</p>
<h2>سياسة الشحن</h2>
<h3>تجهيز الطلبات</h3>
<p>يتم تجهيز الطلب بعد تأكيده وإتمام عملية الدفع بنجاح. وسيتم إرسال تأكيد الطلب من خلال بيانات التواصل المسجلة أثناء إتمام عملية الشراء.</p>
<p>قد تحتاج الطلبات المقدمة خلال عطلات نهاية الأسبوع أو العطلات الرسمية أو فترات العروض والتخفيضات إلى وقت إضافي للتجهيز.</p>
<h3>التوصيل داخل الكويت</h3>
<p>نوفر خدمة التوصيل إلى جميع المناطق المتاحة داخل دولة الكويت. وتستغرق مدة التوصيل عادةً من يومين إلى 4 أيام عمل بعد تأكيد الطلب.</p>
<p>تُعد مدة التوصيل تقديرية، وقد تختلف حسب منطقة التوصيل، وتوفر المنتجات، والأحوال الجوية، والعطلات الرسمية، أو أي ظروف أخرى خارجة عن إرادتنا.</p>
<h3>معلومات التوصيل</h3>
<p>يجب على العميل إدخال عنوان توصيل كامل وصحيح، بما في ذلك المنطقة، والقطعة، والشارع، ورقم المبنى أو المنزل، والطابق، ورقم الشقة إن وجد.</p>
<p>كما يجب توفير رقم هاتف صالح حتى يتمكن مندوب التوصيل من التواصل مع العميل. ولا تتحمل GR8 Trend مسؤولية أي تأخير ناتج عن إدخال بيانات توصيل غير صحيحة أو غير مكتملة.</p>
<p>في حال تعذر التواصل مع العميل أو عدم وجوده وقت التوصيل، فقد تتم إعادة جدولة الطلب، وقد يتم تطبيق رسوم توصيل إضافية.</p>
<h3>رسوم الشحن</h3>
<p>ستظهر رسوم الشحن، إن وجدت، أثناء إتمام عملية الشراء وقبل تأكيد الطلب.</p>
<p>قد يتم احتساب رسوم إضافية في حال إدخال عنوان غير صحيح، أو تعذر تسليم الطلب، أو طلب تغيير موقع التوصيل بعد إرسال الطلب.</p>
<h3>تتبع الطلب</h3>
<p>عند توفر الخدمة، سيتم إرسال تحديث للعميل بعد خروج الطلب للتوصيل. وللاستفسار عن حالة الطلب، يرجى التواصل مع خدمة العملاء وتزويدهم برقم الطلب.</p>
<h3>فحص الطلب عند الاستلام</h3>
<p>يرجى فحص الشحنة عند الاستلام. وفي حال كان التغليف تالفًا أو مفتوحًا أو كان الطلب غير مكتمل، يرجى إبلاغ مندوب التوصيل والتواصل مع خدمة العملاء فورًا.</p>
<h2>الاستبدال والاسترجاع</h2>
<p>نحرص على رضاكم عن مشترياتكم. وفي حال رغبتكم في استبدال أو استرجاع منتج مؤهل، يرجى التواصل معنا خلال 14 يومًا من تاريخ استلام الطلب.</p>
<p>قد لا يتم قبول الطلبات المقدمة بعد انتهاء مدة الاستبدال والاسترجاع المحددة.</p>
<h3>شروط الاستبدال والاسترجاع</h3>
<p>لقبول طلب الاستبدال أو الاسترجاع، يجب أن يكون المنتج:</p>
<ul>
<li>غير مستخدم أو ملبوس أو مغسول</li>
<li>بحالته وتغليفه الأصليين</li>
<li>خاليًا من البقع أو العطور أو الدخان أو مستحضرات التجميل أو التلف</li>
<li>محتفظًا بجميع البطاقات والملصقات الأصلية</li>
<li>مرفقًا بالفاتورة أو تأكيد الطلب</li>
<li>معادًا كمجموعة كاملة إذا تم شراؤه ضمن طقم</li>
</ul>
<p>تحتفظ GR8 Trend بحق رفض أي منتج لا يستوفي الشروط المذكورة.</p>
<h3>المنتجات غير القابلة للاستبدال أو الاسترجاع</h3>
<p>لأسباب تتعلق بالنظافة والسلامة وجودة المنتجات، لا يمكن استبدال أو استرجاع المنتجات التالية، إلا إذا كانت معيبة أو تم إرسالها بالخطأ:</p>
<ul>
<li>الملابس الداخلية ومنتجات الاستخدام الشخصي</li>
<li>المنتجات المعدلة أو المفصلة أو المصنوعة حسب الطلب</li>
<li>المنتجات التي تم ارتداؤها أو غسلها أو استخدامها أو إتلافها</li>
<li>المنتجات التي لا تحتوي على تغليفها أو بطاقاتها الأصلية</li>
<li>منتجات التصفية أو البيع النهائي الموضح أنها غير قابلة للاسترجاع</li>
<li>بطاقات الهدايا أو الهدايا الترويجية</li>
</ul>
<h3>إجراءات الاستبدال</h3>
<p>لطلب الاستبدال، يرجى التواصل مع خدمة العملاء وتزويدهم برقم الطلب، والمنتج المطلوب استبداله، وسبب طلب الاستبدال.</p>
<p>يخضع الاستبدال لتوفر المنتج واللون والمقاس المطلوب. وفي حال عدم توفر البديل، يمكن للعميل اختيار منتج مؤهل آخر أو طلب استرجاع المبلغ وفقًا لهذه السياسة.</p>
<p>قد يتم تطبيق رسوم توصيل على عملية الاستبدال، إلا إذا كان المنتج المستلم معيبًا أو تالفًا أو مختلفًا عن المنتج المطلوب.</p>
<h3>المنتجات التالفة أو المعيبة أو غير الصحيحة</h3>
<p>إذا استلمت منتجًا تالفًا أو معيبًا أو مختلفًا عن المنتج المطلوب، يرجى التواصل معنا في أقرب وقت ممكن بعد الاستلام.</p>
<p>يرجى تزويدنا بما يلي:</p>
<ul>
<li>رقم الطلب</li>
<li>وصف واضح للمشكلة</li>
<li>صور أو مقاطع فيديو واضحة للمنتج والتغليف</li>
</ul>
<p>بعد التحقق من المشكلة، ستقوم GR8 Trend بترتيب الاستبدال المناسب أو استرجاع المبلغ دون فرض رسوم توصيل إضافية.</p>
<h2>سياسة استرجاع المبالغ</h2>
<p>سيتم فحص المنتجات المرتجعة بعد استلامها. وفي حال الموافقة على طلب الاسترجاع، سيتم إعادة المبلغ من خلال وسيلة الدفع الأصلية المستخدمة في عملية الشراء.</p>
<p>قد تختلف المدة اللازمة لظهور المبلغ المسترجع حسب البنك أو مزود خدمة الدفع. ولا تُسترجع رسوم الشحن أو التوصيل الأصلية، إلا إذا كان المنتج معيبًا أو تالفًا أو تم إرساله بالخطأ.</p>
<p>إذا لم يستوفِ المنتج المرتجع شروط الاسترجاع، فقد يتم رفض طلب استرجاع المبلغ وإعادة المنتج إلى العميل على نفقته.</p>
<h2>إلغاء الطلب</h2>
<p>يمكن للعميل طلب إلغاء الطلب قبل تجهيزه أو إرساله للتوصيل. وبعد خروج الطلب للتوصيل، لا يمكن إلغاؤه وسيتم التعامل معه وفقًا لسياسة الاسترجاع.</p>
<p>تحتفظ GR8 Trend بحق إلغاء أي طلب بسبب عدم توفر المنتج، أو وجود مشكلة في الدفع، أو خطأ في السعر، أو لأي أسباب تشغيلية أخرى. وفي حال إتمام الدفع، سيتم إعادة المبلغ للعميل.</p>
<h2>تحديثات السياسة</h2>
<p>تحتفظ GR8 Trend بحق تعديل سياسة الشحن والاستبدال والاسترجاع في أي وقت، وتصبح أي تعديلات سارية فور نشرها على الموقع.</p>
<h2>تواصل معنا</h2>
<p>للاستفسارات المتعلقة بالشحن أو الاستبدال أو الاسترجاع، يرجى التواصل مع فريق خدمة العملاء وتزويدهم برقم الطلب حتى نتمكن من مساعدتكم بشكل أسرع.</p>
"""

PRIVACY_EN = """\
<p>GR8 Trend respects your privacy and is committed to protecting your personal information. By using our website, you agree to the practices described in this policy.</p>
<h2>Information We Collect</h2>
<p>We may collect your name, phone number, email address, delivery address, order details, payment status, and information submitted through our website.</p>
<h2>How We Use Your Information</h2>
<p>We use your information to:</p>
<ul>
<li>Process and deliver orders</li>
<li>Manage payments, returns, and refunds</li>
<li>Provide customer support</li>
<li>Improve our website and services</li>
<li>Send offers with your consent</li>
<li>Prevent fraud and maintain security</li>
</ul>
<h2>Payment Security</h2>
<p>Payments are securely processed through authorized payment providers. GR8 Trend does not normally store complete card information.</p>
<h2>Cookies</h2>
<p>We may use cookies to operate the website, save preferences, analyze performance, and improve your shopping experience. You can manage cookies through your browser settings.</p>
<h2>Sharing Information</h2>
<p>We may share necessary information with delivery companies, payment providers, and technical service providers. We do not sell or rent your personal information.</p>
<h2>Data Protection</h2>
<p>We take reasonable measures to protect your information against unauthorized access, loss, or misuse. Customers are responsible for keeping their account passwords confidential.</p>
<h2>Your Rights</h2>
<p>You may request to access, correct, or delete eligible personal information or unsubscribe from promotional communications by contacting us.</p>
<h2>Policy Updates</h2>
<p>GR8 Trend may update this policy when necessary. Any changes will be published on this page.</p>
"""

PRIVACY_AR = """\
<p>تحترم GR8 Trend خصوصيتكم وتلتزم بحماية معلوماتكم الشخصية. وباستخدامكم للموقع، فإنكم توافقون على الممارسات الموضحة في هذه السياسة.</p>
<h2>المعلومات التي نجمعها</h2>
<p>قد نجمع الاسم، ورقم الهاتف، والبريد الإلكتروني، وعنوان التوصيل، وتفاصيل الطلب، وحالة الدفع، والمعلومات المقدمة عبر الموقع.</p>
<h2>كيفية استخدام معلوماتكم</h2>
<p>نستخدم معلوماتكم من أجل:</p>
<ul>
<li>تجهيز الطلبات وتوصيلها</li>
<li>إدارة المدفوعات والاسترجاع</li>
<li>تقديم خدمة العملاء</li>
<li>تحسين الموقع والخدمات</li>
<li>إرسال العروض بعد موافقتكم</li>
<li>منع الاحتيال والمحافظة على الأمان</li>
</ul>
<h2>أمان الدفع</h2>
<p>تتم معالجة المدفوعات بأمان من خلال مزودي دفع معتمدين، ولا تقوم GR8 Trend عادةً بتخزين بيانات البطاقات كاملةً.</p>
<h2>ملفات تعريف الارتباط</h2>
<p>قد نستخدم ملفات تعريف الارتباط لتشغيل الموقع، وحفظ التفضيلات، وتحليل الأداء، وتحسين تجربة التسوق. ويمكنكم إدارتها من إعدادات المتصفح.</p>
<h2>مشاركة المعلومات</h2>
<p>قد نشارك المعلومات الضرورية مع شركات التوصيل، ومزودي الدفع، ومقدمي الخدمات التقنية. ولا نقوم ببيع معلوماتكم الشخصية أو تأجيرها.</p>
<h2>حماية المعلومات</h2>
<p>نتخذ إجراءات مناسبة لحماية معلوماتكم من الوصول غير المصرح به أو الفقد أو سوء الاستخدام. ويتحمل العميل مسؤولية المحافظة على سرية كلمة مرور حسابه.</p>
<h2>حقوقكم</h2>
<p>يمكنكم طلب الاطلاع على معلوماتكم أو تصحيحها أو حذف المعلومات المؤهلة، أو إلغاء الاشتراك في الرسائل الترويجية، من خلال التواصل معنا.</p>
<h2>تحديث السياسة</h2>
<p>يجوز لـ GR8 Trend تحديث هذه السياسة عند الحاجة، وسيتم نشر أي تعديلات على هذه الصفحة.</p>
"""

TERMS_EN = """\
<p>By using the GR8 Trend website or placing an order, you agree to the following terms and conditions.</p>
<h2>Products &amp; Prices</h2>
<p>We aim to display accurate product descriptions, colours, availability, and prices. However, slight differences or errors may occur. Prices and offers may change without prior notice.</p>
<h2>Orders &amp; Payments</h2>
<p>Orders are confirmed after successful payment and verification. GR8 Trend may cancel an order due to product unavailability, incorrect pricing, payment issues, or suspected fraud.</p>
<h2>Shipping</h2>
<p>Customers must provide accurate delivery information. Delivery times are estimated and may vary due to location, holidays, weather, or circumstances beyond our control.</p>
<h2>Returns &amp; Exchanges</h2>
<p>Eligible items may be returned or exchanged according to our Shipping &amp; Returns Policy. Products must be unused, unwashed, and returned with their original packaging and tags.</p>
<h2>Website Use</h2>
<p>The website must not be used for unlawful activities, fraud, security interference, or unauthorized copying of its content. All website content belongs to GR8 Trend or its respective owners.</p>
<h2>Liability</h2>
<p>GR8 Trend is not responsible for indirect losses, service interruptions, or delays caused by circumstances beyond its reasonable control.</p>
<h2>Changes to the Terms</h2>
<p>GR8 Trend may update these terms when necessary. Updated terms will become effective once published on the website.</p>
<h2>Contact Us</h2>
<p>For questions regarding these terms, please contact GR8 Trend through the contact details available on the website.</p>
"""

TERMS_AR = """\
<p>باستخدام موقع GR8 Trend أو تقديم طلب، فإنك توافق على الشروط والأحكام التالية.</p>
<h2>المنتجات والأسعار</h2>
<p>نسعى لعرض أوصاف المنتجات وألوانها وتوفرها وأسعارها بدقة، ومع ذلك قد تحدث اختلافات بسيطة أو أخطاء. وقد تتغير الأسعار والعروض دون إشعار مسبق.</p>
<h2>الطلبات والمدفوعات</h2>
<p>يتم تأكيد الطلب بعد إتمام الدفع والتحقق منه. ويحق لـ GR8 Trend إلغاء الطلب بسبب عدم توفر المنتج، أو خطأ في السعر، أو مشكلة في الدفع، أو الاشتباه في الاحتيال.</p>
<h2>الشحن</h2>
<p>يجب على العميل تقديم بيانات توصيل صحيحة. ومدة التوصيل تقديرية وقد تختلف بسبب الموقع أو العطلات أو الأحوال الجوية أو الظروف الخارجة عن إرادتنا.</p>
<h2>الاستبدال والاسترجاع</h2>
<p>يمكن استبدال أو استرجاع المنتجات المؤهلة وفقًا لسياسة الشحن والاسترجاع. ويجب أن تكون المنتجات غير مستخدمة أو مغسولة، وبحالتها وتغليفها وبطاقاتها الأصلية.</p>
<h2>استخدام الموقع</h2>
<p>يُحظر استخدام الموقع لأي نشاط غير قانوني، أو احتيالي، أو يضر بأمان الموقع، أو نسخ محتواه دون تصريح. جميع محتويات الموقع مملوكة لـ GR8 Trend أو لأصحابها المعنيين.</p>
<h2>المسؤولية</h2>
<p>لا تتحمل GR8 Trend مسؤولية الخسائر غير المباشرة، أو انقطاع الخدمة، أو التأخير الناتج عن ظروف خارجة عن إرادتها.</p>
<h2>تعديل الشروط</h2>
<p>يجوز لـ GR8 Trend تحديث هذه الشروط عند الحاجة، وتصبح التعديلات سارية فور نشرها على الموقع.</p>
<h2>تواصل معنا</h2>
<p>للاستفسار عن هذه الشروط، يرجى التواصل مع GR8 Trend من خلال بيانات التواصل المتوفرة على الموقع.</p>
"""

# (code, locale, title, meta_description, body) — slugs are left untouched so
# existing footer links, sitemaps and shared URLs keep resolving.
CONTENT = [
    (
        "shipping_returns", "en",
        "Shipping & Returns Policy",
        "GR8 Trend shipping, delivery, exchange, return and refund policy for orders within Kuwait.",
        SHIPPING_EN,
    ),
    (
        "shipping_returns", "ar",
        "سياسة الشحن والاستبدال والاسترجاع",
        "سياسة الشحن والتوصيل والاستبدال والاسترجاع واسترداد المبالغ لطلبات GR8 Trend داخل الكويت.",
        SHIPPING_AR,
    ),
    (
        "privacy_policy", "en",
        "Privacy Policy",
        "How GR8 Trend collects, uses, shares and protects your personal information.",
        PRIVACY_EN,
    ),
    (
        "privacy_policy", "ar",
        "سياسة الخصوصية",
        "كيف تجمع GR8 Trend معلوماتكم الشخصية وتستخدمها وتشاركها وتحميها.",
        PRIVACY_AR,
    ),
    (
        "terms_conditions", "en",
        "Terms & Conditions",
        "The terms and conditions that apply when using the GR8 Trend website or placing an order.",
        TERMS_EN,
    ),
    (
        "terms_conditions", "ar",
        "الشروط والأحكام",
        "الشروط والأحكام المطبقة عند استخدام موقع GR8 Trend أو تقديم طلب.",
        TERMS_AR,
    ),
]

PAGE_CODES = ["shipping_returns", "privacy_policy", "terms_conditions"]


def upgrade() -> None:
    connection = op.get_bind()

    for code, locale, title, meta_description, body in CONTENT:
        connection.execute(
            sa.text(
                """
                UPDATE page_translations pt
                SET title = :title,
                    body = :body,
                    meta_description = :meta_description,
                    updated_at = now()
                FROM pages p
                WHERE p.id = pt.page_id
                  AND p.code = :code
                  AND pt.locale = :locale
                """
            ),
            {
                "code": code,
                "locale": locale,
                "title": title,
                "meta_description": meta_description,
                "body": body,
            },
        )

    connection.execute(
        sa.text(
            """
            UPDATE pages
            SET status = 'published',
                published_at = COALESCE(published_at, now()),
                updated_at = now()
            WHERE code = ANY(:codes)
            """
        ),
        {"codes": PAGE_CODES},
    )


def downgrade() -> None:
    # Content-only migration: reverting the schema does not need to reinstate
    # placeholder copy, and unpublishing live legal pages on a downgrade would
    # be worse than leaving the text in place. Intentionally a no-op.
    pass
