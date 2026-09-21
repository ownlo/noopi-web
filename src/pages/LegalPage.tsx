import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand, Page } from '../components/ui'

const EFFECTIVE_DATE = '2026년 9월 21일'
const CONTACT_EMAIL = 'ownlo.company@gmail.com'

function LegalPage({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = `${title} | NOOPI`
    return () => { document.title = 'NOOPI | 우리끼리 모이면, 바로 게임 시작!' }
  }, [title])

  return (
    <Page className="legalPage">
      <header className="legalHeader">
        <Link to="/" aria-label="NOOPI 홈으로"><Brand /></Link>
        <Link className="legalHomeLink" to="/" aria-label="정책 페이지 닫고 홈으로">×</Link>
      </header>
      <article className="legalDocument">
        <p className="eyebrow">NOOPI POLICY</p>
        <h1>{title}</h1>
        <p className="legalSummary">{summary}</p>
        <p className="legalDate">시행일: {EFFECTIVE_DATE}</p>
        {children}
      </article>
      <footer className="legalDocumentFooter">
        <Link to="/privacy">개인정보처리방침</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms">이용약관</Link>
      </footer>
    </Page>
  )
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="개인정보처리방침"
      summary="NOOPI 운영팀은 회원가입 없이 서비스를 제공하며, 게임 진행에 필요한 최소한의 정보만 처리합니다."
    >
      <section>
        <h2>1. 처리하는 개인정보</h2>
        <p>NOOPI는 서비스 이용 과정에서 다음 정보를 처리합니다.</p>
        <ul>
          <li><strong>이용자가 입력하는 정보:</strong> 닉네임, 성별</li>
          <li><strong>서비스가 생성하는 정보:</strong> 브라우저별 임의 식별값(clientId), Room 참가 및 게임 진행·행동·결과 정보</li>
          <li><strong>자동으로 생성될 수 있는 정보:</strong> IP 주소, 접속 일시, 브라우저·기기 정보, 서비스 이용 및 오류 기록</li>
        </ul>
        <p>NOOPI는 이름, 전화번호, 이메일 주소, 주민등록번호 또는 결제정보를 필수로 요구하지 않습니다. 닉네임에는 본명이나 연락처처럼 개인을 알아볼 수 있는 정보를 입력하지 마세요.</p>
      </section>

      <section>
        <h2>2. 처리 목적</h2>
        <ul>
          <li>Room 생성·참가 및 동일 브라우저의 참가자 식별</li>
          <li>새로고침 또는 일시적인 연결 종료 후 게임 상태 복구</li>
          <li>실시간 게임 진행, 중복 행동 방지 및 결과 제공</li>
          <li>서비스 장애 대응, 보안 유지 및 부정 이용 방지</li>
        </ul>
      </section>

      <section>
        <h2>3. 보유 및 이용 기간</h2>
        <ul>
          <li><strong>브라우저 저장 정보:</strong> clientId와 마지막 Room 식별값은 이용자가 브라우저 저장소를 삭제할 때까지 기기에 저장됩니다.</li>
          <li><strong>Room·Player·게임 정보:</strong> Room이 유지되는 동안 처리하며, 방장이 Room을 종료하면 지체 없이 파기합니다.</li>
          <li><strong>접속·오류 기록:</strong> 서비스 안정성과 보안 목적을 달성하면 지체 없이 파기합니다. 다만 관계 법령에 보존 의무가 있는 경우에는 해당 기간 동안 분리해 보관합니다.</li>
        </ul>
      </section>

      <section>
        <h2>4. 제3자 제공 및 처리 위탁</h2>
        <p>NOOPI는 개인정보를 판매하지 않으며, 이용자의 동의 없이 제3자에게 제공하지 않습니다. 다만 법령에 근거가 있거나 수사기관 등 적법한 권한을 가진 기관의 요청이 있는 경우는 예외입니다.</p>
        <p>서비스 운영을 위해 호스팅·네트워크 등 외부 사업자의 기반 시설을 이용할 수 있습니다. 개인정보 처리업무의 위탁 또는 국외 이전이 발생하는 경우 대상, 항목, 목적, 국가와 보유 기간을 이 방침에 공개하고 필요한 절차를 따릅니다.</p>
      </section>

      <section>
        <h2>5. 브라우저 저장소</h2>
        <p>NOOPI는 쿠키 대신 브라우저의 localStorage에 <code>noopi.clientId</code>와 <code>noopi.lastRoomId</code>를 저장할 수 있습니다. 브라우저 설정에서 사이트 데이터를 삭제하면 함께 삭제되며, 이후 기존 참가자 상태를 복구하지 못할 수 있습니다.</p>
      </section>

      <section>
        <h2>6. 파기 절차와 방법</h2>
        <p>보유 목적을 달성한 정보는 복구하거나 재생할 수 없도록 삭제합니다. 전자 파일은 기록을 복구할 수 없는 방식으로 삭제하며, 별도 문서가 생성된 경우에는 분쇄 또는 소각합니다.</p>
      </section>

      <section>
        <h2>7. 이용자의 권리</h2>
        <p>이용자는 자신의 개인정보에 대해 열람, 정정, 삭제 또는 처리 정지를 요청할 수 있습니다. 계정이 없는 서비스 특성상 요청자 확인을 위해 clientId, Room 정보 등 필요한 최소한의 정보를 요청할 수 있습니다.</p>
        <p>브라우저 저장 정보는 브라우저의 사이트 데이터 삭제 기능을 통해 직접 삭제할 수 있습니다.</p>
      </section>

      <section>
        <h2>8. 만 14세 미만 아동</h2>
        <p>NOOPI는 만 14세 미만 아동의 개인정보를 법정대리인 동의 없이 의도적으로 수집하지 않습니다. 만 14세 미만 이용자는 법정대리인의 지도와 동의 아래 서비스를 이용해야 하며, 동의 없이 개인정보가 수집된 사실을 확인하면 지체 없이 삭제합니다.</p>
      </section>

      <section>
        <h2>9. 안전성 확보 조치</h2>
        <p>NOOPI는 전송 구간 보호, 접근 권한 관리, 비밀 게임정보의 이용자별 분리, 불필요한 정보의 최소 수집 등 개인정보를 안전하게 처리하기 위한 조치를 적용합니다.</p>
      </section>

      <section>
        <h2>10. 개인정보 보호 문의</h2>
        <dl>
          <div><dt>담당</dt><dd>NOOPI 운영팀</dd></div>
          <div><dt>이메일</dt><dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd></div>
        </dl>
        <p>개인정보 침해에 대한 상담이 필요한 경우 개인정보침해신고센터(국번 없이 118) 또는 개인정보분쟁조정위원회(1833-6972)에 문의할 수 있습니다.</p>
      </section>

      <section>
        <h2>11. 방침의 변경</h2>
        <p>법령이나 서비스 내용이 변경되면 이 방침을 수정할 수 있습니다. 중요한 변경은 시행 전에 서비스 화면을 통해 알리며, 문서 상단에 시행일을 표시합니다.</p>
      </section>
    </LegalPage>
  )
}

export function TermsPage() {
  return (
    <LegalPage
      title="이용약관"
      summary="이 약관은 NOOPI가 제공하는 실시간 멀티플레이 게임 웹서비스의 이용 조건과 운영 원칙을 정합니다."
    >
      <section>
        <h2>1. 목적</h2>
        <p>이 약관은 NOOPI 운영팀(이하 “운영팀”)과 서비스를 이용하는 사람(이하 “이용자”) 사이의 권리, 의무 및 서비스 이용 조건을 정하는 것을 목적으로 합니다.</p>
      </section>

      <section>
        <h2>2. 서비스 내용</h2>
        <p>NOOPI는 이용자가 QR 또는 Room Code로 같은 Room에 참가하여 여러 게임을 실시간으로 진행할 수 있도록 돕는 모바일 웹서비스입니다. 별도의 회원가입이나 로그인 없이 이용할 수 있습니다.</p>
        <p>게임의 상태, 순서, 역할, 투표와 결과는 서버가 정한 상태를 기준으로 제공됩니다. 통신 지연이나 일시적인 연결 오류로 화면 표시가 늦어질 수 있습니다.</p>
      </section>

      <section>
        <h2>3. 약관의 적용과 변경</h2>
        <p>이 약관은 서비스 화면에 게시한 날부터 적용됩니다. 운영팀은 관계 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 이용자에게 불리한 중요한 변경은 시행 전에 서비스 화면을 통해 알립니다.</p>
      </section>

      <section>
        <h2>4. Room과 이용자 책임</h2>
        <ul>
          <li>Room을 만든 이용자는 방장이 되며 게임 선택, 진행 및 Room 종료 등 서비스가 제공하는 관리 기능을 사용할 수 있습니다.</li>
          <li>방장이 Room을 종료하면 해당 Room과 진행 중인 게임도 종료되고 참가자는 더 이상 해당 상태를 복구할 수 없습니다.</li>
          <li>이용자는 닉네임과 Room Code가 다른 사람에게 노출되지 않도록 주의해야 합니다.</li>
          <li>clientId는 인증수단이 아니므로 브라우저 데이터 삭제, 기기 변경 또는 정보 노출 시 기존 참가자 상태를 복구하지 못하거나 다른 사람이 접근할 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2>5. 이용자의 의무</h2>
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>타인을 사칭하거나 다른 사람의 개인정보를 닉네임 등에 입력하는 행위</li>
          <li>욕설, 혐오, 괴롭힘 등으로 다른 이용자에게 피해를 주는 행위</li>
          <li>서비스의 오류를 악용하거나 비정상적인 요청으로 게임 진행을 방해하는 행위</li>
          <li>서비스나 서버에 무단으로 접근하거나 보안 조치를 우회하는 행위</li>
          <li>서비스의 프로그램·이미지·문구 등을 권리자의 허락 없이 복제, 배포 또는 영리적으로 이용하는 행위</li>
          <li>관계 법령이나 공공질서에 위반되는 행위</li>
        </ul>
      </section>

      <section>
        <h2>6. 서비스 이용 제한</h2>
        <p>운영팀은 이용자가 이 약관을 위반하거나 서비스의 안정적인 운영을 방해하는 경우 해당 Room 또는 서비스 이용을 제한할 수 있습니다. 긴급한 보안 대응이 필요한 경우에는 사전 안내 없이 제한한 뒤 그 사유를 알릴 수 있습니다.</p>
      </section>

      <section>
        <h2>7. 서비스의 변경과 중단</h2>
        <p>운영팀은 점검, 장애, 통신사 또는 기반 시설의 문제, 천재지변이나 서비스 개선을 위해 서비스의 전부 또는 일부를 변경하거나 일시 중단할 수 있습니다. 예측 가능한 중요한 중단은 가능한 범위에서 미리 알립니다.</p>
      </section>

      <section>
        <h2>8. 지식재산권</h2>
        <p>NOOPI의 이름, 캐릭터, 화면 디자인, 프로그램과 운영팀이 만든 콘텐츠에 관한 권리는 운영팀 또는 정당한 권리자에게 있습니다. 이 약관은 이용자에게 개인적인 서비스 이용 권한만을 부여합니다.</p>
      </section>

      <section>
        <h2>9. 책임의 범위</h2>
        <p>운영팀은 안정적인 서비스를 제공하기 위해 노력합니다. 다만 운영팀의 고의 또는 중대한 과실이 없는 한 이용자의 통신 환경, 기기 문제, 브라우저 데이터 삭제, 이용자 사이의 오프라인 행동 또는 불가항력으로 발생한 손해에 책임을 지지 않습니다.</p>
        <p>운영팀은 무료로 제공되는 서비스와 관련하여 관계 법령이 허용하는 범위에서 간접적·특별한 손해에 대한 책임을 제한할 수 있습니다. 이 조항은 법령상 배제할 수 없는 소비자의 권리를 제한하지 않습니다.</p>
      </section>

      <section>
        <h2>10. 개인정보 보호</h2>
        <p>개인정보의 처리에 관한 내용은 <Link to="/privacy">개인정보처리방침</Link>에 따릅니다.</p>
      </section>

      <section>
        <h2>11. 준거법과 분쟁 해결</h2>
        <p>이 약관은 대한민국 법령에 따라 해석됩니다. 서비스 이용과 관련한 분쟁은 당사자 사이의 협의를 통해 해결하며, 협의가 이루어지지 않을 경우 대한민국 민사소송법상 관할 법원에서 해결합니다.</p>
      </section>

      <section>
        <h2>12. 문의</h2>
        <p>약관과 서비스 이용에 관한 문의는 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 보내주세요.</p>
      </section>
    </LegalPage>
  )
}
